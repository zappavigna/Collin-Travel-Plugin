jQuery(document).ready(function($) {
    const detailsContainer = '.collin-event-details-container';
    let current_event_id = $('.collin-event-packages-wrapper').data('event-id');
    const ajax_obj = collin_event_ajax_obj || {}; // Assicurati che collin_event_ajax_obj sia ben localizzato

    // --- Funzione per aggiornare la quantità ---
    function updateQuantity($input, change) {
        console.log('--- updateQuantity START ---');
        console.log('Input Element:', $input.get(0)); 
        console.log('Change Amount:', change);
        let currentValString = $input.val();
        console.log('Raw input value string:', currentValString);
        let currentVal = parseInt(currentValString);
        const minVal = parseInt($input.attr('min'));
        const maxVal = parseInt($input.attr('max'));
        console.log('Parsed currentVal:', currentVal);
        console.log('Min attribute:', $input.attr('min'), '-> Parsed minVal:', minVal);
        console.log('Max attribute:', $input.attr('max'), '-> Parsed maxVal:', maxVal);

        if (isNaN(currentVal)) {
            currentVal = (isNaN(minVal) ? 0 : minVal);
            console.log('currentVal was NaN, reset based on minVal to:', currentVal);
            if (change < 0) { // Se si decrementa un campo vuoto/NaN
                $input.val(currentVal); 
                console.log('updateQuantity: Input was NaN, decremented. Set to minVal:', currentVal);
                $input.trigger('change');
                console.log('--- updateQuantity END (NaN decrement case) ---');
                return;
            }
        }

        let newVal = currentVal + change;
        console.log('Calculated newVal (currentVal + change):', newVal);

        if (!isNaN(minVal) && newVal < minVal) {
            newVal = minVal;
            console.log('newVal adjusted to minVal:', newVal);
        }

        if (!isNaN(maxVal) && newVal > maxVal) {
            newVal = maxVal;
            console.log('newVal adjusted to maxVal:', newVal);
        }
        
        console.log('Final newVal to be set:', newVal);
        $input.val(newVal);
        
        if (parseInt($input.val()) !== newVal) {
            console.warn('Input value did NOT visually update as expected immediately after .val()! Current visual value:', $input.val());
        }

        $input.trigger('change'); 
        console.log('updateQuantity: "change" event triggered.');
        console.log('--- updateQuantity END ---');
    }

    // --- Gestore per i pulsanti +/- quantità ---
    $('body').on('click', '.collin-event-details-container .quantity-btn', function() {
        const $button = $(this);
        let $input = $button.siblings('.quantity-input');
        if ($input.length === 0) { 
            $input = $button.closest('.quantity-control').find('.quantity-input'); // Fallback
        }
        if ($input.length === 0 || $input.is(':disabled')) {
            console.log('Input non trovato o disabilitato per il pulsante quantità.');
            return;
        }
        if ($button.hasClass('quantity-plus')) { 
            updateQuantity($input, 1); 
        } else if ($button.hasClass('quantity-minus')) { 
            updateQuantity($input, -1); 
        }
    });

    // --- Gestore per input diretto quantità e cambio dropdown hotel ---
    $('body').on('change input', '.collin-event-details-container .quantity-input', validateAddToCartButton);
    
    $('body').on('change', '.collin-event-details-container .collin-hotel-variation-dropdown', function() {
        const $dropdown = $(this);
        const $productItem = $dropdown.closest('.collin-hotel-product-item');
        const $qtyControl = $productItem.find('.hotel-quantity-control');
        const $qtyInput = $qtyControl.find('.collin-hotel-selected-variation-qty');
        const $priceDisplay = $qtyControl.find('.variation-price-hotel');
        const selectedOption = $dropdown.find('option:selected');

        if ($dropdown.val() && selectedOption.length && !selectedOption.is(':disabled')) {
            const priceHtml = selectedOption.data('price-html') || '';
            const maxQty = selectedOption.data('max-qty') !== undefined ? selectedOption.data('max-qty') : ''; // Gestisce stringa vuota per no-limit
            
            $priceDisplay.html(priceHtml ? (priceHtml + ' ') : '').show();
            $qtyInput.val(1); 
            
            if (maxQty !== '' && !isNaN(parseInt(maxQty))) { // Se maxQty è un numero valido
                $qtyInput.attr('max', parseInt(maxQty));
            } else { // Se maxQty è vuoto o non numerico, rimuovi l'attributo (nessun limite o limite gestito da WooCommerce)
                $qtyInput.removeAttr('max');
            }

            $qtyInput.data('variation-id', $dropdown.val()); 
            $qtyControl.show();
            $qtyInput.prop('disabled', false);
            $qtyControl.find('.quantity-btn').prop('disabled', false);
        } else {
            $qtyControl.hide();
            $priceDisplay.hide();
            $qtyInput.val(0); 
            $qtyInput.removeData('variation-id');
            $qtyInput.prop('disabled', true);
            $qtyControl.find('.quantity-btn').prop('disabled', true);
        }
        validateAddToCartButton();
    });

    // --- INIZIO NUOVA LOGICA ---
    // Gestore per la selezione del Luogo di Partenza della navetta
    $('body').on('change', '.collin-shuttle-location-radio', function() {
        const $radio = $(this);
        const selectedLocation = $radio.val();
        const $wrapper = $radio.closest('.collin-shuttle-wrapper');
        
        // Nascondi tutti i contenitori di date
        const $allDateContainers = $wrapper.find('.collin-shuttle-dates-container');
        $allDateContainers.hide();

        // Azzera le quantità dei campi non visibili per evitare acquisti errati
        $allDateContainers.not('[data-location="' + selectedLocation + '"]').find('.quantity-input').val(0);

        // Mostra il contenitore di date corretto
        const $targetContainer = $wrapper.find('.collin-shuttle-dates-container[data-location="' + selectedLocation + '"]');
        $targetContainer.show();
        
        // Riesegui la validazione del pulsante Aggiungi al Carrello
        validateAddToCartButton();
    });
    // --- FINE NUOVA LOGICA ---

    // --- Funzione per validare e abilitare/disabilitare il pulsante Aggiungi al Carrello ---
    function validateAddToCartButton() {
        let canAddToCart = false;
        const $detailsWrapper = $(detailsContainer);
        
        if (!$detailsWrapper.length || $detailsWrapper.find('.collin-event-add-to-cart-button').length === 0) {
            // Se il contenitore o il pulsante non esistono (es. prima del caricamento AJAX), non fare nulla o assicurati che sia disabilitato
             $('.collin-event-add-to-cart-button').first().prop('disabled', true); // Tentativo generico se fuori contesto
            return;
        }

        const currentPackageType = $detailsWrapper.data('current-package-type');
        const currentPackageBaseProductIds = $detailsWrapper.data('current-package-base-ids') || []; 
        let itemsSelectedCount = 0; 

        console.log('Validating for package type:', currentPackageType, 'Base IDs:', currentPackageBaseProductIds);

        if (currentPackageType === 'shuttle_hotel' || currentPackageType === 'complete_package') {
            if (currentPackageBaseProductIds.length === 0) {
                console.log('No base product IDs defined for combined package validation.');
                canAddToCart = false; 
            } else {
                let satisfiedBaseProducts = {}; 
                currentPackageBaseProductIds.forEach(id => satisfiedBaseProducts[parseInt(id)] = false); // Assicura che gli ID siano numeri

                // Prodotti semplici nel pacchetto
                $detailsWrapper.find('.collin-simple-product-qty').each(function() {
                    const $input = $(this);
                    const productId = parseInt($input.data('product-id'));
                    if (currentPackageBaseProductIds.includes(productId) && !$input.is(':disabled') && parseInt($input.val()) > 0) {
                        satisfiedBaseProducts[productId] = true;
                        console.log('Combined - Simple Satisfied:', productId);
                    }
                });

                // Varianti (non hotel) nel pacchetto
                $detailsWrapper.find('.collin-variation-qty').each(function() {
                    const $input = $(this);
                    const parentProductId = parseInt($input.data('product-id')); 
                    if (currentPackageBaseProductIds.includes(parentProductId) && !$input.is(':disabled') && parseInt($input.val()) > 0) {
                        // Per i pacchetti combinati, se un prodotto variabile ha *qualsiasi* variante selezionata, consideriamo il "genitore" soddisfatto.
                        // Se il pacchetto completo ha ID_TICKET, ID_NAVETTA, ID_HOTEL,
                        // e ID_TICKET è un variabile, basta che una variante del ticket sia > 0.
                        satisfiedBaseProducts[parentProductId] = true; 
                        console.log('Combined - Non-Hotel Variation Parent Satisfied:', parentProductId);
                    }
                });

                // Hotel nel pacchetto
                const $hotelDropdown = $detailsWrapper.find('.collin-hotel-variation-dropdown');
                if ($hotelDropdown.length) {
                    const hotelParentProductId = parseInt($hotelDropdown.data('product-id'));
                    if (currentPackageBaseProductIds.includes(hotelParentProductId)) {
                        const $hotelQtyInput = $detailsWrapper.find('.collin-hotel-selected-variation-qty');
                        const hotelSelectedVariationId = $hotelQtyInput.data('variation-id'); 
                        
                        if (hotelSelectedVariationId && 
                            !$hotelQtyInput.is(':disabled') && 
                            parseInt($hotelQtyInput.val()) >= 1 &&
                            $hotelDropdown.val() == hotelSelectedVariationId && // Verifica che il dropdown corrisponda ancora
                            !$hotelDropdown.find('option:selected').is(':disabled')) {
                            satisfiedBaseProducts[hotelParentProductId] = true;
                            console.log('Combined - Hotel Parent Satisfied:', hotelParentProductId);
                        }
                    }
                }
                
                let allBaseSatisfied = true;
                console.log('Status soddisfazione base IDs:', satisfiedBaseProducts);
                for (const baseId of currentPackageBaseProductIds) {
                    if (!satisfiedBaseProducts[parseInt(baseId)]) { // Assicura confronto numerico
                        allBaseSatisfied = false; 
                        console.log('Base ID NOT satisfied:', baseId);
                        break;
                    }
                }
                canAddToCart = allBaseSatisfied;
                if(allBaseSatisfied) itemsSelectedCount = currentPackageBaseProductIds.length; // Per debug
            }
        } else { // Per pacchetti non combinati (es. solo Ticket, solo Navetta) o se non è definito un tipo specifico
            console.log('Validating for single/generic package type.');
            $detailsWrapper.find('.collin-simple-product-qty, .collin-variation-qty').each(function() {
                const $input = $(this);
                if (!$input.is(':disabled') && parseInt($input.val()) > 0) {
                    itemsSelectedCount++;
                }
            });
            const $hotelDropdown = $detailsWrapper.find('.collin-hotel-variation-dropdown'); // Hotel come pacchetto singolo
            if ($hotelDropdown.length && !$detailsWrapper.data('current-package-type')) { // Se è un pacchetto hotel singolo
                const $hotelQtyInput = $detailsWrapper.find('.collin-hotel-selected-variation-qty');
                if ($hotelDropdown.val() && 
                    !$hotelQtyInput.is(':disabled') && 
                    parseInt($hotelQtyInput.val()) >= 1 &&
                    !$hotelDropdown.find('option:selected').is(':disabled')) {
                    itemsSelectedCount++;
                }
            }
            canAddToCart = itemsSelectedCount > 0;
        }
        
        console.log('validateAddToCartButton - canAddToCart:', canAddToCart, 'itemsSelectedCount:', itemsSelectedCount);
        $detailsWrapper.find('.collin-event-add-to-cart-button').prop('disabled', !canAddToCart);
    }

    // --- Funzione per caricare i dettagli del prodotto/pacchetto via AJAX ---
    function loadProductDetails(product_ids_str, package_type) {
        console.log('loadProductDetails called for package:', package_type, 'IDs:', product_ids_str);
        $.ajax({
            url: ajax_obj.ajax_url,
            type: 'POST',
            data: {
                action: 'collin_event_get_product_variations',
                nonce: ajax_obj.nonce,
                product_ids: product_ids_str,
                package_type: package_type,
                event_id: current_event_id
            },
            success: function(response) {
                if (response.success && response.data && response.data.html) {
                $(detailsContainer).html(response.data.html);

                // --- INIZIO NUOVO CODICE ---
                // Dopo aver inserito l'HTML, controlliamo se esiste uno slider da inizializzare.
                const hotelSliderElement = document.querySelector('.hotel-gallery-slider');

                if (hotelSliderElement) {
                    console.log('Trovato slider per hotel. Inizializzo Swiper.js.');
                    new Swiper(hotelSliderElement, {
                        // Opzioni di Swiper
                        loop: true, // Riavvia da capo quando finisce
                        navigation: {
                            nextEl: '.swiper-button-next',
                            prevEl: '.swiper-button-prev',
                        },
                        pagination: {
                            el: '.swiper-pagination',
                            clickable: true, // Rende i pallini cliccabili
                        },
                        keyboard: { // Permette di usare le frecce della tastiera
                            enabled: true,
                        },
                    });
                }
                // --- FINE NUOVO CODICE ---

                // Inizializza lo stato del dropdown hotel, se presente, dopo aver caricato l'HTML
                $(detailsContainer).find('.collin-hotel-variation-dropdown').trigger('change');
                validateAddToCartButton();
                } else {
                    const errorMsg = response.data && response.data.message ? response.data.message : (ajax_obj.error_load_text || 'Errore caricamento prodotti.');
                    $(detailsContainer).html('<p class="error-message">' + errorMsg + '</p>');
                }
            },
            error: function() {
                $(detailsContainer).html('<p class="error-message">' + (ajax_obj.error_ajax_text || 'Errore AJAX nel caricamento dei prodotti.') + '</p>');
            }
        });
    }
    
    // --- NUOVA Funzione Modale per Conflitto Ticket --- 
    function showTicketConflictChoiceModal(product_ids_str_for_package, package_type_for_package, ticket_id_to_remove) {
        console.log('[Modal] Attempting to show. Target package if switch:', package_type_for_package, 'Ticket ID to potentially remove:', ticket_id_to_remove);
        $('#collin-event-ticket-conflict-choice-modal').remove(); 

        const modalTitle = ajax_obj.conflict_choice_title || 'Conflitto Ticket nel Carrello';
        const modalText = ajax_obj.conflict_choice_text || 'Hai già un ticket per questo evento nel carrello. Se desideri acquistare questo pacchetto, il ticket esistente verrà rimosso.';
        const btnContinueTicket = ajax_obj.conflict_choice_btn_cart || 'Vai al Carrello';
        const btnSwitchPackage = ajax_obj.conflict_choice_btn_package || 'Passa al Pacchetto';

        const modalHtml = `
            <div id="collin-event-ticket-conflict-choice-modal" class="collin-event-modal-overlay">
                <div class="collin-event-modal-content">
                    <h3>${modalTitle}</h3>
                    <p>${modalText}</p>
                    <div class="collin-event-modal-actions">
                        <button id="collin-modal-go-to-cart" class="button">${btnContinueTicket}</button>
                        <button id="collin-modal-switch-to-package" class="button button-primary">${btnSwitchPackage}</button>
                    </div>
                </div>
            </div>`;
        $('body').append(modalHtml);
        
        setTimeout(function() { 
            $('#collin-event-ticket-conflict-choice-modal').addClass('active');
            console.log('[Modal] HTML appended and "active" class added.');
        }, 10); 

        $('#collin-modal-go-to-cart').on('click', function(event) {
            event.preventDefault();
            console.log('[Modal] "Vai al Carrello" clicked.');
            const $modal = $('#collin-event-ticket-conflict-choice-modal');
            $modal.removeClass('active');
            setTimeout(function() { $modal.remove(); }, 300); 
            
            if (ajax_obj.cart_url) {
                window.location.href = ajax_obj.cart_url;
            } else {
                console.warn('[Modal] URL Carrello (ajax_obj.cart_url) non disponibile.');
                $('.collin-event-package-button').removeClass('active'); 
                $(detailsContainer).empty().hide(); 
            }
        });

        $('#collin-modal-switch-to-package').on('click', function(event) {
            event.preventDefault(); // Buona pratica
            console.log('[Modal] "Passa al Pacchetto" clicked. Target package:', package_type_for_package, 'Attempting to remove ticket ID:', ticket_id_to_remove);
            
            const $modal = $('#collin-event-ticket-conflict-choice-modal');
            $modal.removeClass('active');
            setTimeout(function() { $modal.remove(); }, 300);
            
            // Mostra un messaggio di attesa
            $(detailsContainer).show().html('<p class="loading-message">' + (ajax_obj.removing_ticket_text || 'Rimozione ticket in corso...') + '</p>');

            $.ajax({
                url: ajax_obj.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'collin_event_ajax_remove_ticket_from_cart',
                    nonce: ajax_obj.nonce,
                    ticket_product_id: ticket_id_to_remove
                },
                success: function(removeResponse) {
                    if (removeResponse && removeResponse.success) {
                        console.log('[Modal AJAX Success] Ticket rimosso con successo dal server:', removeResponse.data.message);
                        // Azione desiderata: salva il pacchetto da cliccare e ricarica la pagina
                        localStorage.setItem('collin_event_auto_click_package', package_type_for_package);
                        window.location.reload(); // RICARICA LA PAGINA
                    } else {
                        // La rimozione è fallita secondo la risposta del server
                        let errorMsg = ajax_obj.error_remove_ticket_fail_text || 'Impossibile rimuovere il ticket esistente. Si prega di rimuoverlo manualmente dal carrello e riprovare.';
                        if (removeResponse && removeResponse.data && removeResponse.data.message) {
                            errorMsg = removeResponse.data.message; // Usa il messaggio specifico dal server se disponibile
                        }
                        console.warn('[Modal AJAX Success but App Error] Tentativo di rimozione ticket fallito:', errorMsg);
                        alert(errorMsg); // Informa l'utente
                        
                        // Ripristina la UI senza ricaricare, dato che la rimozione è fallita
                        $(detailsContainer).empty().hide(); // Pulisci il messaggio di caricamento
                        $('.collin-event-package-button').removeClass('active'); // Deseleziona il pulsante pacchetto
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('[Modal AJAX Error] Errore di comunicazione durante la rimozione del ticket:', textStatus, errorThrown);
                    if (jqXHR.responseText === '0' || jqXHR.status === 400) {
                        alert(ajax_obj.error_nonce_fail_text || 'Errore di sicurezza o richiesta non valida durante la rimozione del ticket. Riprova o contatta l\'assistenza.');
                    } else {
                        alert(ajax_obj.error_ajax_text || 'Errore di comunicazione durante la rimozione del ticket. Riprova.');
                    }
                    
                    // Ripristina la UI senza ricaricare
                    $(detailsContainer).empty().hide();
                    $('.collin-event-package-button').removeClass('active');
                }
                // Non serve 'complete' se 'success' gestisce il reload e 'error' gestisce il fallimento rimanendo sulla pagina.
            });
        });
    }

    // --- GESTORE CLICK PULSANTI PACCHETTO (AGGIORNATO con nuovo modale) ---
    $('.collin-event-package-button').on('click', function() {
        const $clickedButton = $(this);
        const packageName = $clickedButton.text();
        const package_type = $clickedButton.data('package');
        const product_ids_str = $clickedButton.data('product-ids') ? $clickedButton.data('product-ids').toString() : "";
        
        current_event_id = $clickedButton.closest('.collin-event-packages-wrapper').data('event-id');

        $('.collin-event-package-button').removeClass('active');
        $clickedButton.addClass('active');
        
        const product_ids_array_for_validation = product_ids_str ? product_ids_str.split(',').map(id => parseInt(id.trim())) : [];
        // Salva dati per la validazione sul contenitore che riceverà l'HTML dei prodotti
        $(detailsContainer).data('current-package-type', package_type);
        $(detailsContainer).data('current-package-base-ids', product_ids_array_for_validation);

        const event_ticket_id_to_check = ajax_obj.ticket_product_id ? parseInt(ajax_obj.ticket_product_id) : 0;

        // Mostra messaggio di caricamento/verifica iniziale
        $(detailsContainer).show().html('<p class="loading-message">' + (ajax_obj.checking_cart_text || 'Verifica carrello in corso...') + '</p>');

        if (event_ticket_id_to_check > 0 && (package_type === 'shuttle_hotel' || package_type === 'complete_package')) {
            console.log('Pacchetto selezionato:', package_type, '- Controllo per ticket esistente ID:', event_ticket_id_to_check);
            $.ajax({
                url: ajax_obj.ajax_url,
                type: 'POST',
                data: {
                    action: 'collin_event_check_ticket_in_cart',
                    nonce: ajax_obj.nonce,
                    ticket_product_id: event_ticket_id_to_check
                },
                success: function(checkResponse) {
                    if (checkResponse.success && checkResponse.data && checkResponse.data.ticket_in_cart) {
                        console.log('Ticket esistente trovato nel carrello. Mostro modale di scelta.');
                        // Non mostrare il loading message del pacchetto qui, il modale lo gestisce
                        showTicketConflictChoiceModal(product_ids_str, package_type, event_ticket_id_to_check);
                    } else {
                        console.log('Nessun ticket esistente trovato (o errore nel check), carico direttamente i dettagli del pacchetto.');
                        $(detailsContainer).html('<p class="loading-message">' + (ajax_obj.loading_text || 'Caricamento Pacchetto ' + packageName +'...') + '</p>');
                        loadProductDetails(product_ids_str, package_type);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('Errore AJAX durante il controllo del ticket nel carrello:', textStatus, errorThrown);
                    $(detailsContainer).html('<p class="loading-message">' + (ajax_obj.loading_text || 'Caricamento Pacchetto ' + packageName +'...') + '</p>');
                    loadProductDetails(product_ids_str, package_type); 
                }
            });
        } else {
            console.log('Caricamento diretto dettagli per pacchetto:', package_type);
            $(detailsContainer).html('<p class="loading-message">' + (ajax_obj.loading_text || 'Caricamento Pacchetto ' + packageName +'...') + '</p>');
            loadProductDetails(product_ids_str, package_type);
        }
    });

    // --- Gestore Click "Aggiungi al Carrello" ---
    $('body').on('click', '.collin-event-details-container .collin-event-add-to-cart-button', function(e) {
        e.preventDefault();
        const $button = $(this);
        if ($button.is(':disabled')) return;

        let items_to_add = [];
        const $detailsWrapper = $(detailsContainer);

        // Prodotti Semplici
        $detailsWrapper.find('.collin-simple-product-qty').each(function() { 
            const $input = $(this); const quantity = parseInt($input.val());
            if (!$input.is(':disabled') && quantity > 0) { items_to_add.push({ product_id: $input.data('product-id'), quantity: quantity });}
        });
        // Varianti (non hotel)
        $detailsWrapper.find('.collin-variation-qty').each(function() { 
            const $input = $(this); const quantity = parseInt($input.val());
            if (!$input.is(':disabled') && quantity > 0) { items_to_add.push({ product_id: $input.data('product-id'), variation_id: $input.data('variation-id'), quantity: quantity });}
        });
        // Hotel
        const $hotelQtyInput = $detailsWrapper.find('.collin-hotel-selected-variation-qty');
        const hotelVariationId = $hotelQtyInput.data('variation-id');
        if (hotelVariationId && !$hotelQtyInput.is(':disabled')) {
            const quantity = parseInt($hotelQtyInput.val());
            if (quantity >= 1) {
                 const $hotelDropdown = $detailsWrapper.find('.collin-hotel-variation-dropdown');
                 if ($hotelDropdown.val() == hotelVariationId && !$hotelDropdown.find('option:selected').is(':disabled')) {
                     items_to_add.push({ product_id: $hotelDropdown.data('product-id'), variation_id: hotelVariationId, quantity: quantity });
                 }
            }
        }

        if (items_to_add.length === 0) {
            alert(ajax_obj.error_no_items_text || 'Seleziona almeno un prodotto con quantità maggiore di zero.');
            return;
        }
        $button.prop('disabled', true).text(ajax_obj.adding_to_cart_text || 'Aggiungendo...');
        // Chiamata AJAX per aggiungere al carrello
        $.ajax({
            url: ajax_obj.ajax_url, type: 'POST',
            data: { action: 'collin_event_add_to_cart_multiple', nonce: ajax_obj.nonce, data: JSON.stringify(items_to_add) },
            success: function(response) {
                if (response.success) {
                    if (response.data.cart_url) { window.location.href = response.data.cart_url; } 
                    else { window.location.reload(); }
                } else {
                    alert(response.data.message || (ajax_obj.error_add_cart_text || 'Errore durante l\'aggiunta al carrello.'));
                    $button.prop('disabled', false).text(ajax_obj.add_to_cart_text || 'Aggiungi al Carrello');
                }
            },
            error: function() {
                alert(ajax_obj.error_ajax_text || 'Errore AJAX.');
                $button.prop('disabled', false).text(ajax_obj.add_to_cart_text || 'Aggiungi al Carrello');
            }
        });
    });
        
    // --- Inizializzazione ---
    $(detailsContainer).hide(); // Nascondi i dettagli all'inizio
    // Se ci sono pulsanti pacchetto già attivi da un caricamento pagina precedente (es. errore validazione PHP),
    // potresti voler inizializzare la validazione del pulsante carrello.
    if ($('.collin-event-package-button.active').length > 0 && $(detailsContainer).html().trim() !== "") {
        validateAddToCartButton();
    }
    
    const autoClickPackageType = localStorage.getItem('collin_event_auto_click_package');
    if (autoClickPackageType) {
        localStorage.removeItem('collin_event_auto_click_package'); // Rimuovi subito per evitare loop
        const $targetButton = $('.collin-event-package-button[data-package="' + autoClickPackageType + '"]');
        if ($targetButton.length) {
            console.log('[AutoClick] Trovato pacchetto da auto-cliccare:', autoClickPackageType);
            // Piccolo ritardo per assicurare che tutto sia pronto dopo il reload
            setTimeout(function() {
                console.log('[AutoClick] Eseguo trigger click su:', $targetButton);
                $targetButton.trigger('click');
            }, 500); 
        } else {
            console.warn('[AutoClick] Pacchetto target non trovato per data-package:', autoClickPackageType);
        }
    }

});