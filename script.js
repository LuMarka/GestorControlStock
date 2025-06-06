document.addEventListener('DOMContentLoaded', () => {
    const stockTableBody = document.getElementById('stock-table-body');
    const itemFormModal = document.getElementById('item-form-modal');
    const stockForm = document.getElementById('stock-form');
    const addnewBtn = document.getElementById('add-new-btn');
    const cancelFormBtn = document.getElementById('cancel-form-btn');

    // Form fields
    const itemCodigoInput = document.getElementById('item-codigo');
    const itemDescripcionInput = document.getElementById('item-descripcion');
    const itemCantidadInput = document.getElementById('item-cantidad');
    const itemUbicacionInput = document.getElementById('item-ubicacion');
    const itemProveedorInput = document.getElementById('item-proveedor');

    // Filter fields
    const filterProveedorInput = document.getElementById('filter-proveedor');
    const filterCodigoInput = document.getElementById('filter-codigo');
    const filterDescripcionInput = document.getElementById('filter-descripcion');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    let stockData = []; // Array de objetos para almacenar los repuestos
    let editingItemIndex = -1; // -1 si no estamos editando, de lo contrario, el índice del ítem

    // --- Data Persistence Functions ---
    function loadStock() {
        const storedStock = localStorage.getItem('stockDeposito');
        try {
            const parsedStock = JSON.parse(storedStock);

            if (Array.isArray(parsedStock)) {
                stockData = parsedStock;
            } else {
                console.warn('Datos en localStorage para "stockDeposito" no son un array válido. Inicializando stock vacío.');
                stockData = [];
            }
        } catch (e) {
            console.error('Error al parsear stock de localStorage:', e);
            stockData = [];
        }
    }

    function saveStock() {
        localStorage.setItem('stockDeposito', JSON.stringify(stockData));
    }

    // --- UI Rendering Functions ---
    // ESTA ES LA FUNCIÓN A MODIFICAR
    function renderStock(filteredData = stockData) {
        stockTableBody.innerHTML = ''; // Limpiar el contenido actual

        if (filteredData.length === 0) {
            const noDataRow = stockTableBody.insertRow();
            noDataRow.innerHTML = `<td colspan="6" style="text-align: center; padding: 20px;">No hay repuestos que coincidan con los filtros.</td>`;
            return;
        }

        // Ordenar los datos por Código para una vista consistente
        filteredData.sort((a, b) => a.codigo.localeCompare(b.codigo));

        filteredData.forEach((item) => {
            const row = stockTableBody.insertRow();
            const fullIndex = stockData.findIndex(sItem => sItem.codigo === item.codigo);

            if (fullIndex === -1) {
                console.error("Error: Item filtrado no encontrado en stockData original.", item);
                return;
            }

            // MODIFICACIÓN CLAVE: Se añaden los atributos data-label a cada <td>
            row.innerHTML = `
                <td data-label="Código">${item.codigo}</td>
                <td data-label="Descripción Producto">${item.descripcion}</td>
                <td data-label="Cantidad">${item.cantidad}</td>
                <td data-label="Ubicación">${item.ubicacion}</td>
                <td data-label="Proveedor">${item.proveedor}</td>
                <td data-label="Acciones" class="table-actions">
                    <button class="add-unit-btn" data-full-index="${fullIndex}">Añadir Cantidad</button>
                    <button class="edit-btn" data-full-index="${fullIndex}">Editar</button>
                    <button class="delete-btn" data-full-index="${fullIndex}">Eliminar</button>
                </td>
            `;
        });

        // Attach event listeners to action buttons after rendering
        attachTableButtonListeners();
    }

    function attachTableButtonListeners() {
        document.querySelectorAll('.add-unit-btn').forEach(button => {
            button.onclick = (e) => {
                const index = parseInt(e.target.dataset.fullIndex);
                addCustomQuantity(index);
            };
        });
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.onclick = (e) => {
                const index = parseInt(e.target.dataset.fullIndex);
                openEditForm(index);
            };
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.onclick = (e) => {
                const index = parseInt(e.target.dataset.fullIndex);
                deleteItem(index);
            };
        });
    }

    // --- Form Modal Control ---
    function showFormModal() {
        itemFormModal.classList.add('active');
    }

    function hideFormModal() {
        itemFormModal.classList.remove('active');
        stockForm.reset(); // Limpiar el formulario
        editingItemIndex = -1; // Resetear el índice de edición
        itemCodigoInput.readOnly = false; // <-- Asegura que sea editable para la próxima adición
    }

    // --- CRUD Operations ---
    function addItem(item) {
        const existingItem = stockData.find(i => i.codigo.toLowerCase() === item.codigo.toLowerCase());
        if (existingItem) {
            alert('Ya existe un repuesto con este código. Por favor, edita el existente o usa un código diferente.');
            return false;
        }
        stockData.push(item);
        saveStock();
        applyFilters(); // Re-render con posibles filtros
        return true;
    }

    function updateItem(index, updatedItem) {
        const codeExists = stockData.some((item, i) =>
            i !== index && item.codigo.toLowerCase() === updatedItem.codigo.toLowerCase()
        );
        if (codeExists) {
            alert('El nuevo código ya está en uso por otro repuesto.');
            return false;
        }
        stockData[index] = updatedItem;
        saveStock();
        applyFilters();
        return true;
    }

    function deleteItem(index) {
        const itemToDelete = stockData[index];
        if (confirm(`¿Estás seguro de que quieres eliminar "${itemToDelete.descripcion}" (Código: ${itemToDelete.codigo})?`)) {
            stockData.splice(index, 1);
            saveStock();
            applyFilters();
        }
    }

    function updateQuantity(index, change) {
        stockData[index].cantidad += change;
        if (stockData[index].cantidad < 0) {
            stockData[index].cantidad = 0; // Evitar cantidades negativas
        }
        saveStock();
        applyFilters();
    }

    // --- NUEVA FUNCIÓN PARA AÑADIR CANTIDAD PERSONALIZADA ---
    function addCustomQuantity(index) {
        const item = stockData[index];
        let quantityToAdd = prompt(`¿Cuántas unidades deseas añadir a "${item.descripcion}" (Actual: ${item.cantidad})?`, '1');

        if (quantityToAdd === null) {
            return;
        }

        quantityToAdd = parseInt(quantityToAdd);

        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            alert('Por favor, ingresa un número válido y positivo.');
            return;
        }

        updateQuantity(index, quantityToAdd);
    }

    // --- Event Listeners ---
    addnewBtn.addEventListener('click', () => {
        stockForm.reset();
        itemCodigoInput.readOnly = false;
        editingItemIndex = -1;
        showFormModal();
    });

    cancelFormBtn.addEventListener('click', hideFormModal);

    stockForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const item = {
            codigo: itemCodigoInput.value.trim(),
            descripcion: itemDescripcionInput.value.trim(),
            cantidad: parseInt(itemCantidadInput.value),
            ubicacion: itemUbicacionInput.value.trim(),
            proveedor: itemProveedorInput.value.trim()
        };

        if (isNaN(item.cantidad) || item.cantidad < 0) {
            alert('La cantidad debe ser un número válido y no puede ser negativa.');
            return;
        }

        if (editingItemIndex > -1) {
            if (updateItem(editingItemIndex, item)) {
                hideFormModal();
            }
        } else {
            if (addItem(item)) {
                hideFormModal();
            }
        }
    });

    function openEditForm(index) {
        editingItemIndex = index;
        const itemToEdit = stockData[index];

        itemCodigoInput.value = itemToEdit.codigo;
        itemCodigoInput.readOnly = true;
        itemDescripcionInput.value = itemToEdit.descripcion;
        itemCantidadInput.value = itemToEdit.cantidad;
        itemUbicacionInput.value = itemToEdit.ubicacion;
        itemProveedorInput.value = itemToEdit.proveedor;

        showFormModal();
    }

    // --- Filter Functionality ---
    function applyFilters() {
        const filterProveedor = filterProveedorInput.value.toLowerCase();
        const filterCodigo = filterCodigoInput.value.toLowerCase();
        const filterDescripcion = filterDescripcionInput.value.toLowerCase();

        const filteredData = stockData.filter(item => {
            const matchesProveedor = item.proveedor.toLowerCase().includes(filterProveedor);
            const matchesCodigo = item.codigo.toLowerCase().includes(filterCodigo);
            const matchesDescripcion = item.descripcion.toLowerCase().includes(filterDescripcion);
            return matchesProveedor && matchesCodigo && matchesDescripcion;
        });

        renderStock(filteredData);
    }

    filterProveedorInput.addEventListener('input', applyFilters);
    filterCodigoInput.addEventListener('input', applyFilters);
    filterDescripcionInput.addEventListener('input', applyFilters);

    clearFiltersBtn.addEventListener('click', () => {
        filterProveedorInput.value = '';
        filterCodigoInput.value = '';
        filterDescripcionInput.value = '';
        applyFilters(); // Re-render sin filtros
    });

    // Initial load and render
    loadStock();
    renderStock();
});