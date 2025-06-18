jQuery(document).ready(function($) { 
    const detailsContainer = '.collin-event-details-container';
    let current_event_id = $('.collin-event-packages-wrapper').data('event-id');
    const ajax_obj = collin_event_ajax_obj || {};

    // --- NUOVA FUNZIONE DI SUPPORTO PER SINCRONIZZARE L'HOTEL ---
    function syncHotelLocation(selectedShuttleSlug) {
        if (!selectedShuttleSlug) return;

        let bestMatchSlug = '';
        
        // Itera su ogni radio button dei luoghi degli hotel disponibili
        $('.collin-hotel-location-radio').each(function() {
            const $hotelRadio = $(this);
            const hotelSlug = $hotelRadio.val(); // Esempio: 'amsterdam'

            // Controlla se lo slug della navetta (più specifico) INIZIA CON lo slug dell'hotel (più generico)
            if (selectedShuttleSlug.startsWith(hotelSlug)) {
                // Se questo abbinamento è più lungo del migliore trovato finora, è un candidato migliore.
                // Questo assicura la scelta più specifica in caso di ambiguità (es. 'ber' e 'berlin')
                if (hotelSlug.length > bestMatchSlug.length) {
                    bestMatchSlug = hotelSlug;
                }
            }
        });

        // Se alla fine del ciclo abbiamo trovato un abbinamento valido...
        if (bestMatchSlug) {
            const $matchingHotelRadio = $('.collin-hotel-location-radio[value="' + bestMatchSlug + '"]');
            
            // ...e non è già selezionato...
            if ($matchingHotelRadio.length > 0 && !$matchingHotelRadio.is(':checked') && !$matchingHotelRadio.is(':disabled')) {
                // ...lo selezioniamo e scateniamo l'evento 'change' per caricare le camere.
                $matchingHotelRadio.prop('checked', true).trigger('change');
            }
        }
    }

    // --- Funzione per aggiornare la quantità ---
    function updateQuantity($input, change) {
        let currentValString = $input.val();
        let currentVal = parseInt(currentValString);
        const minVal = parseInt($input.attr('min'));
        const maxVal = parseInt($input.attr('max'));

        if (isNaN(currentVal)) {
            currentVal = (isNaN(minVal) ? 0 : minVal);
            if (change < 0) {
                $input.val(currentVal);
                $input.trigger('change');
                return;
            }
        }

        let newVal = currentVal + change;

        if (!isNaN(minVal) && newVal < minVal) {
            newVal = minVal;
        }

        if (!isNaN(maxVal) && newVal > maxVal) {
            newVal = maxVal;
        }
        
        $input.val(newVal);
        $input.trigger('change');
    }

    // --- Gestore per i pulsanti +/- quantità ---
    $('body').on('click', '.collin-event-details-container .quantity-btn', function() {
        const $button = $(this);
        let $input = $button.siblings('.quantity-input');
        if ($input.length === 0) { 
            $input = $button.closest('.quantity-control').find('.quantity-input'); // Fallback
        }
        if ($input.length === 0 || $input.is(':disabled')) {
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
    
// --- GESTORE PER LA SELEZIONE DEL LUOGO/HOTEL ---
$('body').on('change', '.collin-hotel-location-radio', function() {
    const $locationRadio = $(this);
    const selectedLocationSlug = $locationRadio.val();
    const $hotelWrapper = $locationRadio.closest('.collin-hotel-wrapper');
    const productId = $hotelWrapper.data('product-id');
    const $roomsContainer = $hotelWrapper.find('.collin-hotel-rooms-container');
    const $roomOptionsWrapper = $roomsContainer.find('.collin-hotel-room-options');
    
    // Pulisci le selezioni precedenti e nascondi il selettore quantità
    $roomOptionsWrapper.empty();
    $hotelWrapper.find('.hotel-quantity-control').remove(); // Rimuoviamo il vecchio controllo quantità
    validateAddToCartButton();

    if (!productId || !ajax_obj.product_variations_data || !ajax_obj.product_variations_data[productId]) {
        return; // Dati non disponibili
    }

    const allVariations = ajax_obj.product_variations_data[productId];
    
    // Filtra le variazioni (camere) per il luogo selezionato
    const matchingRooms = allVariations.filter(variation => {
        return variation.attributes['attribute_pa_luogo'] === selectedLocationSlug;
    });

    if (matchingRooms.length > 0) {
        let roomsHtml = '';
        matchingRooms.forEach(function(room_data) {
            const variation_id = room_data.variation_id;
            const is_disabled = room_data.is_disabled;
            const radio_id = 'hotel-room-' + variation_id;

            // Estrai il nome della camera dagli attributi (tutto ciò che non è 'pa_luogo')
            let room_name = '';
            for (const attr_key in room_data.attributes) {
                if (attr_key !== 'attribute_pa_luogo') {
                    // Cerca il nome completo della camera nel display_name completo
                    const name_parts = room_data.display_name.split(' - ');
                    const location_part_index = Object.keys(room_data.attributes).indexOf('attribute_pa_luogo');
                    if (name_parts[1-location_part_index]) { // Semplice euristica per trovare l'altro attributo
                       room_name = name_parts[1-location_part_index];
                    } else {
                       room_name = room_data.display_name;
                    }
                    break;
                }
            }

            roomsHtml += `
                <label class="radio" for="${radio_id}">
                    <input 
                        type="radio" 
                        class="collin-hotel-variation-radio" 
                        name="hotel_room_selection_${productId}" 
                        id="${radio_id}"
                        value="${variation_id}"
                        ${is_disabled ? 'disabled' : ''}
                        data-price-html="${room_data.price_html.replace(/<[^>]*>?/gm, '')}"
                        data-max-qty="${room_data.max_qty > -1 ? room_data.max_qty : ''}"
                        data-variation-id="${variation_id}"
                        data-description="${room_data.description || ''}"
                    >
                    <span>
                        ${room_name}
                        ${is_disabled ? ' (Esaurito)' : ''}
                    </span>
                </label>
            `;
        });
        
        $roomOptionsWrapper.html(roomsHtml);
        $roomsContainer.show();
    } else {
        $roomOptionsWrapper.html('<p>Nessuna camera disponibile per questo hotel.</p>');
        $roomsContainer.show();
    }
});
   /* VECCHIA GESTIONE HOTEL SELECT
    $('body').on('change', '.collin-event-details-container .collin-hotel-variation-dropdown', function() {
        const $dropdown = $(this);
        const $productItem = $dropdown.closest('.collin-hotel-product-item');
        const $qtyControl = $productItem.find('.hotel-quantity-control');
        const $qtyInput = $qtyControl.find('.collin-hotel-selected-variation-qty');
        const $priceDisplay = $qtyControl.find('.variation-price-hotel');
        const selectedOption = $dropdown.find('option:selected');

        if ($dropdown.val() && selectedOption.length && !selectedOption.is(':disabled')) {
            const priceHtml = selectedOption.data('price-html') || '';
            const maxQty = selectedOption.data('max-qty') !== undefined ? selectedOption.data('max-qty') : '';
            
            $priceDisplay.html(priceHtml ? (priceHtml + ' ') : '').show();
            $qtyInput.val(1); 
            
            if (maxQty !== '' && !isNaN(parseInt(maxQty))) {
                $qtyInput.attr('max', parseInt(maxQty));
            } else {
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
    });*/
 
    // --- NUOVO: Gestore per i radio button dell'hotel (AGGIORNATO CON DESCRIZIONE) ---
    $('body').on('change', '.collin-hotel-variation-radio', function() {
        const $radio = $(this);
        const $productItem = $radio.closest('.collin-product-item, .collin-hotel-wrapper');
        
        // Rimuovi eventuali controlli quantità esistenti per evitare duplicati
        $productItem.find('.hotel-quantity-control').remove();

        if ($radio.is(':checked') && !$radio.is(':disabled')) {
            const variationDesc = $radio.data('description') || '';
            const variationName = $radio.closest('label').find('span').text().trim();
            const priceHtml = $radio.data('price-html') || '';
            const maxQty = $radio.data('max-qty') !== undefined ? $radio.data('max-qty') : '';
            const variationId = $radio.data('variation-id');

            // Crea dinamicamente il HTML per il controllo quantità
            const quantityControlHtml = `
                <div class="quantity-control hotel-quantity-control" style="margin-top: 15px; display: flex; flex-wrap: wrap; justify-content: space-between; height: auto; align-items: center;">
                    <div class="hotel-selection-details" style="flex-basis: 50%; min-width: 250px; line-height: 1.4;">
                        <div class="selected-variation-description" style="font-weight: bold; font-size: 1.1em;"></div>
                        <div class="selected-variation-name-small" style="font-size: 0.9em; opacity: 0.8; font-style: italic;"></div>
                        <span class="variation-price-hotel" style="font-size: 1em; color: #555; display: block; margin-top: 5px;"></span>
                    </div>
                    <div class="qnt__select" style="display: flex; align-items: center; flex-basis: 50%; min-width: 200px; justify-content: space-between;">
                        <h3 class="mr-2 black" style="text-transform:capitalize; margin-bottom: 0; margin-right: 10px; font-size:1em;">Quantità</h3>
                        
                        <div class="bottoni" style="display: flex; align-items: center; flex-basis: 50%; min-width: 200px; justify-content: flex-end;">
                            <button type="button" class="quantity-btn quantity-minus" aria-label="Diminuisci quantità">-</button>
                            <input type="number" class="collin-hotel-selected-variation-qty quantity-input" value="1" min="1" name="quantity_hotel_selected" aria-label="Quantità Hotel" data-variation-id="${variationId}">
                            <button type="button" class="quantity-btn quantity-plus" aria-label="Aumenta quantità">+</button>
                        </div>
                    </div>
                </div>
            `;

            // Inserisci il controllo quantità dopo il contenitore delle opzioni
            $radio.closest('.collin-hotel-room-options, .collin-hotel-product-item').append(quantityControlHtml);
            
            const $newQtyControl = $productItem.find('.hotel-quantity-control');
            const $descDisplay = $newQtyControl.find('.selected-variation-description');
            const $nameDisplay = $newQtyControl.find('.selected-variation-name-small');
            const $priceDisplay = $newQtyControl.find('.variation-price-hotel');
            const $qtyInput = $newQtyControl.find('.collin-hotel-selected-variation-qty');

            if (variationDesc) {
                $descDisplay.html(variationDesc);
                $nameDisplay.html(variationName);
            } else {
                $descDisplay.html(variationName);
                $nameDisplay.html('');
            }
            
            $priceDisplay.html(priceHtml);
            if (maxQty !== '') {
                $qtyInput.attr('max', maxQty);
            }
        }
        validateAddToCartButton();
    });
    // --- Gestore per TUTTI i radio button di prodotti variabili (Navetta standard E complessa) ---
    $('body').on('change', '.collin-complex-shuttle-radio', function() {
        const $radio = $(this);
         // --- BLOCCO DI CODICE DA AGGIUNGERE ---
        const attributeSlug = $radio.closest('.collin-shuttle-attribute-selection').data('attribute-slug');
        // Sincronizza l'hotel solo se l'attributo modificato è il luogo di partenza
        if (attributeSlug === 'luogo-di-partenza') { 
            syncHotelLocation($radio.val());
        }
        // --- FINE BLOCCO DI CODICE DA AGGIUNGERE ---

        const parentProductId = $radio.closest('.collin-event-product-section').data('product-id');
        const $shuttleWrapper = $radio.closest('.collin-shuttle-wrapper');
        const $dateContainer = $shuttleWrapper.find('.collin-shuttle-dates-container');
        const shuttleType = $shuttleWrapper.data('shuttle-type'); // 'standard' o 'complex'

        let selectedAttributes = {};
        // Raccogli tutti gli attributi selezionati (esclusa la data)
        $shuttleWrapper.find('.collin-shuttle-attribute-selection').each(function() {
            const attrSlug = $(this).data('attribute-slug');
            const $checkedRadio = $(this).find('input[type="radio"]:checked');
            if ($checkedRadio.length) {
                selectedAttributes[attrSlug] = $checkedRadio.val();
            }
        });

        // Nascondi e pulisci il contenitore delle date
        $dateContainer.empty().hide();
        // Azzera le quantità di tutte le variazioni per evitare acquisti errati
        $shuttleWrapper.find('.collin-variation-qty').val(0);


        const allVariationsForProduct = ajax_obj.product_variations_data && ajax_obj.product_variations_data[parentProductId] 
                                        ? ajax_obj.product_variations_data[parentProductId] 
                                        : [];

        let matchingVariations = [];
        let allRequiredAttributesSelected = true;
        const totalAttributeSets = $shuttleWrapper.find('.collin-shuttle-attribute-selection').length;
        
        // Controlla se tutti i set di attributi (non data) hanno una selezione
        if (Object.keys(selectedAttributes).length !== totalAttributeSets) {
            allRequiredAttributesSelected = false;
        }

        if (allRequiredAttributesSelected && allVariationsForProduct.length > 0) {
            matchingVariations = allVariationsForProduct.filter(variation => {
                let isMatch = true;
                for (const attrSlug in selectedAttributes) {
                    if (variation.attributes['attribute_' + attrSlug] !== selectedAttributes[attrSlug]) {
                        isMatch = false;
                        break;
                    }
                }
                return isMatch;
            });
        }
        
        if (matchingVariations.length > 0) {
            let variationsHtml = '';
            matchingVariations.forEach(function(variation_data) {
                const variation_id = variation_data.variation_id;
                const display_name = variation_data.display_name; // Questo è il nome della data/variazione come desiderato
                const price_html = variation_data.price_html;
                const max_qty_var = variation_data.max_qty;
                const is_var_disabled = variation_data.is_disabled;
                const variation_description = variation_data.description || '';

                variationsHtml += `
                    <div class="collin-variation-item" data-variation-id="${variation_id}" data-product-id="${parentProductId}">
                        <div class="variation-info">
                            <span class="variation-name">${variation_data.primary_name || display_name}</span><br>
                            ${variation_description ? `<span class="variation-description"><i class="fas fa-info-circle"></i> ${variation_description}</span><br>` : ''}
                            <span class="variation-price">${price_html}</span>
                            ${is_var_disabled ? `<span class="sold-out-message">${ajax_obj.sold_out_text || 'Sold Out'}</span>` : ''}
                        </div>
                        <div class="quantity-control">
                            <button type="button" class="quantity-btn quantity-minus" aria-label="${ajax_obj.decrease_qty_text}" ${is_var_disabled ? 'disabled' : ''}>-</button>
                            <input type="number" class="collin-variation-qty quantity-input" value="0" min="0" 
                                ${max_qty_var > -1 ? `max="${max_qty_var}"` : ''} 
                                ${is_var_disabled ? 'disabled' : ''} 
                                data-variation-id="${variation_id}" data-product-id="${parentProductId}" 
                                name="quantity_variation_${variation_id}" aria-label="${ajax_obj.qty_for_text} ${display_name}">
                            <button type="button" class="quantity-btn quantity-plus" aria-label="${ajax_obj.increase_qty_text}" ${is_var_disabled ? 'disabled' : ''}>+</button>
                        </div>
                    </div>`;
            });
            $dateContainer.html(variationsHtml).show();
        }
        
        validateAddToCartButton();
    });

 $('body').on('change', '.collin-shuttle-location-radio', function() {
        const $radio = $(this);
        syncHotelLocation($radio.val()); 
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
    // --- Funzione per validare e abilitare/disabilitare il pulsante Aggiungi al Carrello ---
    // In assets/js/frontend.js, sostituisci l'intera funzione con questa
    function validateAddToCartButton() {
        let canAddToCart = false;
        const $detailsWrapper = $(detailsContainer);
        
        if (!$detailsWrapper.length || $detailsWrapper.find('.collin-event-add-to-cart-button').length === 0) {
            $('.collin-event-add-to-cart-button').first().prop('disabled', true);
            return;
        }

        const currentPackageType = $detailsWrapper.data('current-package-type');
        const currentPackageBaseProductIds = $detailsWrapper.data('current-package-base-ids') || [];
        let itemsSelectedCount = 0;

        // Logica per pacchetti composti (che richiedono la selezione di più prodotti base)
        if (currentPackageType === 'shuttle_hotel' || currentPackageType === 'complete_package') {
            if (currentPackageBaseProductIds.length === 0) {
                canAddToCart = false;
            } else {
                let satisfiedBaseProducts = {};
                currentPackageBaseProductIds.forEach(id => satisfiedBaseProducts[parseInt(id)] = false);

                // 1. Controlla Prodotti Semplici
                $detailsWrapper.find('.collin-simple-product-qty').each(function() {
                    const $input = $(this);
                    const productId = parseInt($input.data('product-id'));
                    if (currentPackageBaseProductIds.includes(productId) && !$input.is(':disabled') && parseInt($input.val()) > 0) {
                        satisfiedBaseProducts[productId] = true;
                    }
                });

                // 2. Controlla Prodotti Variabili (Navette e Ticket)
                $detailsWrapper.find('.collin-event-product-section').each(function() {
                    const sectionProductId = parseInt($(this).data('product-id'));
                    if (!currentPackageBaseProductIds.includes(sectionProductId)) return; // Salta se non è un prodotto base del pacchetto

                    // Logica per Navette (complesse e standard)
                    const $shuttleWrapper = $(this).find('.collin-shuttle-wrapper');
                    if ($shuttleWrapper.length > 0) {
                        let allShuttleAttributesSelected = true;
                        $shuttleWrapper.find('.collin-shuttle-attribute-selection, .collin-shuttle-locations-wrapper').each(function() {
                            if ($(this).find('input[type="radio"]:checked').length === 0) {
                                allShuttleAttributesSelected = false;
                                return false;
                            }
                        });

                        if (allShuttleAttributesSelected && $shuttleWrapper.find('.collin-variation-qty, .collin-shuttle-variation-qty').filter(function() { return parseInt($(this).val()) > 0; }).length > 0) {
                            satisfiedBaseProducts[sectionProductId] = true;
                        }
                    } 
                    // Logica per altri variabili (es. Ticket)
                    else if ($(this).find('.collin-variation-qty').filter(function() { return parseInt($(this).val()) > 0; }).length > 0) {
                        satisfiedBaseProducts[sectionProductId] = true;
                    }
                });
                
                // 3. NUOVA GESTIONE HOTEL (sia multi-luogo che semplice)
                const hotelProductId = parseInt($detailsWrapper.find('.collin-hotel-wrapper, .collin-hotel-product-item').first().data('product-id'));
                if (currentPackageBaseProductIds.includes(hotelProductId)) {
                    const isMultiLocation = $detailsWrapper.find('.collin-hotel-wrapper').length > 0;
                    if (isMultiLocation) {
                        // Hotel multi-luogo
                        const isLocationSelected = $detailsWrapper.find('.collin-hotel-location-radio:checked').length > 0;
                        const isRoomSelected = $detailsWrapper.find('.collin-hotel-variation-radio:checked').length > 0;
                        if (isLocationSelected && isRoomSelected && parseInt($detailsWrapper.find('.collin-hotel-selected-variation-qty').val()) > 0) {
                            satisfiedBaseProducts[hotelProductId] = true;
                        }
                    } else {
                        // Hotel semplice (con radio)
                        const isRoomSelected = $detailsWrapper.find('.collin-hotel-variation-radio:checked').length > 0;
                        if (isRoomSelected && parseInt($detailsWrapper.find('.collin-hotel-selected-variation-qty').val()) > 0) {
                            satisfiedBaseProducts[hotelProductId] = true;
                        }
                    }
                }


                // Verifica finale per pacchetti composti
                let allBaseSatisfied = true;
                for (const baseId of currentPackageBaseProductIds) {
                    if (!satisfiedBaseProducts[parseInt(baseId)]) {
                        allBaseSatisfied = false;
                        break;
                    }
                }
                canAddToCart = allBaseSatisfied;
            }

        } else { // Logica per pacchetti singoli (o nessun pacchetto, solo selezione libera)
            let totalQty = 0;
            
            // Somma quantità da tutti gli input visibili e abilitati
            $detailsWrapper.find('.quantity-input:visible:not(:disabled)').each(function() {
                totalQty += parseInt($(this).val()) || 0;
            });
            
            canAddToCart = totalQty > 0;
        }
        
        // Applica lo stato finale al pulsante
        $detailsWrapper.find('.collin-event-add-to-cart-button').prop('disabled', !canAddToCart);
    }

    // --- Funzione per caricare i dettagli del prodotto/pacchetto via AJAX ---
    function loadProductDetails(product_ids_str, package_type) {
        $(detailsContainer).show().html('<p class="loading-message">' + (ajax_obj.loading_text || 'Caricamento Pacchetto...') + '</p>');
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

                    // Aggiorna i dati delle variazioni globali
                    if (response.data.product_variations_data) {
                        if (!ajax_obj.product_variations_data) {
                            ajax_obj.product_variations_data = {};
                        }
                        for (const prodId in response.data.product_variations_data) {
                            if (response.data.product_variations_data.hasOwnProperty(prodId)) {
                                ajax_obj.product_variations_data[prodId] = response.data.product_variations_data[prodId];
                            }
                        }
                    }

                    const hotelSliderElement = document.querySelector('.hotel-gallery-slider');

                    if (hotelSliderElement) {
                        new Swiper(hotelSliderElement, {
                            loop: true, 
                            navigation: {
                                nextEl: '.swiper-button-next',
                                prevEl: '.swiper-button-prev',
                            },
                            pagination: {
                                el: '.swiper-pagination',
                                clickable: true,
                            },
                            keyboard: { 
                                enabled: true,
                            },
                        });
                    }

                    // Inizializza lo stato del dropdown hotel, se presente
                    $(detailsContainer).find('.collin-hotel-variation-dropdown').trigger('change');
                    
                    // Triggera un cambio su un radio della navetta se già selezionato per inizializzare le date
                    // Questo è importante per i pacchetti dove la navetta è pre-selezionata o per il ricaricamento
                    $(detailsContainer).find('.collin-shuttle-attribute-selection input[type="radio"]:checked').first().trigger('change');

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
    
    // --- Funzione Modale per Conflitto Ticket --- 
    function showTicketConflictChoiceModal(product_ids_str_for_package, package_type_for_package, ticket_id_to_remove) {
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
        }, 10); 

        $('#collin-modal-go-to-cart').on('click', function(event) {
            event.preventDefault();
            const $modal = $('#collin-event-ticket-conflict-choice-modal');
            $modal.removeClass('active');
            setTimeout(function() { $modal.remove(); }, 300); 
            
            if (ajax_obj.cart_url) {
                window.location.href = ajax_obj.cart_url;
            } else {
                $('.collin-event-package-button').removeClass('active'); 
                $(detailsContainer).empty().hide(); 
            }
        });

        $('#collin-modal-switch-to-package').on('click', function(event) {
            event.preventDefault(); 
            
            const $modal = $('#collin-event-ticket-conflict-choice-modal');
            $modal.removeClass('active');
            setTimeout(function() { $modal.remove(); }, 300);
            
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
                        localStorage.setItem('collin_event_auto_click_package', package_type_for_package);
                        window.location.reload(); 
                    } else {
                        let errorMsg = ajax_obj.error_remove_ticket_fail_text || 'Impossibile rimuovere il ticket esistente. Si prega di rimuoverlo manualmente dal carrello e riprovare.';
                        if (removeResponse && removeResponse.data && removeResponse.data.message) {
                            errorMsg = removeResponse.data.message; 
                        }
                        alert(errorMsg); 
                        
                        $(detailsContainer).empty().hide(); 
                        $('.collin-event-package-button').removeClass('active'); 
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    if (jqXHR.responseText === '0' || jqXHR.status === 400) {
                        alert(ajax_obj.error_nonce_fail_text || 'Errore di sicurezza o richiesta non valida durante la rimozione del ticket. Riprova o contatta l\'assistenza.');
                    } else {
                        alert(ajax_obj.error_ajax_text || 'Errore AJAX.');
                    }
                    
                    $(detailsContainer).empty().hide();
                    $('.collin-event-package-button').removeClass('active');
                }
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
        $(detailsContainer).data('current-package-type', package_type);
        $(detailsContainer).data('current-package-base-ids', product_ids_array_for_validation);

        const event_ticket_id_to_check = ajax_obj.ticket_product_id ? parseInt(ajax_obj.ticket_product_id) : 0;

        // Mostra messaggio di caricamento/verifica iniziale
        $(detailsContainer).show().html('<p class="loading-message">' + (ajax_obj.checking_cart_text || 'Verifica carrello in corso...') + '</p>');

        if (event_ticket_id_to_check > 0 && (package_type === 'shuttle_hotel' || package_type === 'complete_package')) {
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
                        showTicketConflictChoiceModal(product_ids_str, package_type, event_ticket_id_to_check);
                    } else {
                        loadProductDetails(product_ids_str, package_type);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // In caso di errore nel check del ticket, procedi comunque a caricare i dettagli del pacchetto
                    loadProductDetails(product_ids_str, package_type); 
                }
            });
        } else {
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
        // Varianti (Navetta standard o complessa, Ticket, ecc.)
        $detailsWrapper.find('.collin-variation-qty').each(function() { 
            const $input = $(this); const quantity = parseInt($input.val());
            // Verifica che l'input non sia all'interno di una navetta complessa con un numero insufficiente di radio selezionati.
            // La validazione a livello di bottone dovrebbe già gestire questo, ma è una sicurezza in più qui.
            const $shuttleWrapper = $input.closest('.collin-shuttle-wrapper');
            let include_variation = true;
            if ($shuttleWrapper.length && $shuttleWrapper.data('shuttle-type') === 'complex') {
                const totalAttrRadios = $shuttleWrapper.find('.collin-shuttle-attribute-selection').length;
                const selectedAttrRadios = $shuttleWrapper.find('.collin-shuttle-attribute-selection input[type="radio"]:checked').length;
                if (selectedAttrRadios !== totalAttrRadios) {
                    include_variation = false; // Se non tutti gli attributi complessi sono selezionati, non includere
                }
            }

            if (include_variation && !$input.is(':disabled') && quantity > 0) { 
                items_to_add.push({ product_id: $input.data('product-id'), variation_id: $input.data('variation-id'), quantity: quantity });
            }
        });
        // Hotel 
        const $selectedRoomRadio = $detailsWrapper.find('.collin-hotel-variation-radio:checked');
        if ($selectedRoomRadio.length > 0) {
            const variationId = $selectedRoomRadio.val();
            // Trova il contenitore genitore corretto, che sia il wrapper multi-luogo o quello per hotel semplice
            const $hotelWrapper = $selectedRoomRadio.closest('.collin-hotel-wrapper, .collin-hotel-product-item');
            const productId = $hotelWrapper.data('product-id');
            // Trova l'input quantità relativo alla selezione
            const $qtyInput = $hotelWrapper.find('.collin-hotel-selected-variation-qty');
            
            if ($qtyInput.length > 0) {
                const quantity = parseInt($qtyInput.val());
                if (quantity >= 1 && variationId && productId) {
                    items_to_add.push({
                        product_id: parseInt(productId),
                        variation_id: parseInt(variationId),
                        quantity: quantity
                    });
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
    $(detailsContainer).hide(); 
    if ($('.collin-event-package-button.active').length > 0 && $(detailsContainer).html().trim() !== "") {
        validateAddToCartButton();
    }
    
    const autoClickPackageType = localStorage.getItem('collin_event_auto_click_package');
    if (autoClickPackageType) {
        localStorage.removeItem('collin_event_auto_click_package'); 
        const $targetButton = $('.collin-event-package-button[data-package="' + autoClickPackageType + '"]');
        if ($targetButton.length) {
            setTimeout(function() {
                $targetButton.trigger('click');
            }, 500); 
        }
    }

});