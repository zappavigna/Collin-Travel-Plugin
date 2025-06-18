jQuery(document).ready(function($) { 
    const detailsContainer = '.collin-event-details-container';
    let current_event_id = $('.collin-event-packages-wrapper').data('event-id');
    const ajax_obj = collin_event_ajax_obj || {};

    // --- NUOVA FUNZIONE PER AGGIORNARE I LIMITI DEGLI EXTRA ---
    function updateExtraLimits() {
        const $detailsWrapper = $(detailsContainer);
        
        // Calcola la quantità totale dei pacchetti
        let totalPackageQty = 0;
        
        // Conta da prodotti semplici pacchetto
        $detailsWrapper.find('.collin-simple-package-item .quantity-input').each(function() {
            if (!$(this).is(':disabled')) {
                totalPackageQty += parseInt($(this).val()) || 0;
            }
        });
        
        // Conta da pacchetti variabili
        $detailsWrapper.find('.collin-package-qty').each(function() {
            if (!$(this).is(':disabled')) {
                totalPackageQty += parseInt($(this).val()) || 0;
            }
        });
        
        // Aggiorna i limiti degli extra
        $detailsWrapper.find('.collin-extra-qty').each(function() {
            const $extraInput = $(this);
            const originalMax = parseInt($extraInput.data('original-max')) || -1;
            let newMax = totalPackageQty;
            
            // Se c'è un limite originale del prodotto, usa il minore tra i due
            if (originalMax > -1 && (newMax === 0 || originalMax < newMax)) {
                newMax = originalMax;
            }
            
            // Se non ci sono pacchetti, disabilita gli extra
            if (totalPackageQty === 0) {
                $extraInput.attr('max', 0).val(0).prop('disabled', true);
                $extraInput.closest('.quantity-control').find('.quantity-btn').prop('disabled', true);
            } else {
                $extraInput.attr('max', newMax).prop('disabled', false);
                $extraInput.closest('.quantity-control').find('.quantity-btn').prop('disabled', false);
                
                // Se la quantità attuale è maggiore del nuovo limite, riducila
                const currentVal = parseInt($extraInput.val()) || 0;
                if (currentVal > newMax) {
                    $extraInput.val(newMax);
                }
            }
        });
    }
    function handlePackageAttributeSelection($radio) {
        const $packageWrapper = $radio.closest('.collin-package-wrapper');
        const productId = $packageWrapper.data('product-id');
        const packageType = $packageWrapper.data('package-type');
        const $currentSelection = $radio.closest('.collin-package-attribute-selection');
        const currentIndex = parseInt($currentSelection.data('attribute-index'));
        
        // Nascondi tutte le selezioni successive
        $packageWrapper.find('.collin-package-attribute-selection').each(function() {
            const thisIndex = parseInt($(this).data('attribute-index'));
            if (thisIndex > currentIndex) {
                $(this).find('label').hide();
                $(this).find('input[type="radio"]').prop('checked', false);
            }
        });
        
        // Nascondi il selettore quantità
        $packageWrapper.find('.collin-package-quantity-wrapper').hide();
        
        // Raccogli tutti gli attributi selezionati
        let selectedAttributes = {};
        let allRequiredSelected = true;
        
        $packageWrapper.find('.collin-package-attribute-selection').each(function() {
            const attrSlug = $(this).data('attribute-slug');
            const $checkedRadio = $(this).find('input[type="radio"]:checked');
            if ($checkedRadio.length) {
                selectedAttributes[attrSlug] = $checkedRadio.val();
            } else if ($(this).data('attribute-index') <= currentIndex) {
                allRequiredSelected = false;
            }
        });
        
        if (!ajax_obj.product_variations_data || !ajax_obj.product_variations_data[productId]) {
            return;
        }
        
        const allVariations = ajax_obj.product_variations_data[productId];
        
        // Trova le variazioni che corrispondono agli attributi selezionati finora
        let matchingVariations = allVariations.filter(variation => {
            let isMatch = true;
            for (const attrSlug in selectedAttributes) {
                if (variation.attributes['attribute_' + attrSlug] !== selectedAttributes[attrSlug]) {
                    isMatch = false;
                    break;
                }
            }
            return isMatch;
        });
        
        // Se c'è un attributo successivo da mostrare
        const $nextSelection = $packageWrapper.find('.collin-package-attribute-selection[data-attribute-index="' + (currentIndex + 1) + '"]');
        if ($nextSelection.length > 0) {
            // Raccogli i valori disponibili per l'attributo successivo dalle variazioni filtrate
            const nextAttrSlug = $nextSelection.data('attribute-slug');
            const availableValues = new Set();
            
            matchingVariations.forEach(variation => {
                const attrValue = variation.attributes['attribute_' + nextAttrSlug];
                if (attrValue) {
                    availableValues.add(attrValue);
                }
            });
            
            // Mostra solo le opzioni disponibili per l'attributo successivo
            $nextSelection.find('label').each(function() {
                const $label = $(this);
                const $input = $label.find('input');
                const value = $input.val();
                
                if (availableValues.has(value)) {
                    $label.show();
                } else {
                    $label.hide();
                    $input.prop('checked', false);
                }
            });
        } else if (matchingVariations.length === 1) {
            // Tutte le selezioni completate, mostra quantità e dettagli
            const selectedVariation = matchingVariations[0];
            showPackageQuantitySelector($packageWrapper, selectedVariation);
        }
        
        validateAddToCartButton();
    }
    
    function showPackageQuantitySelector($packageWrapper, variationData) {
        const $quantityWrapper = $packageWrapper.find('.collin-package-quantity-wrapper');
        const $variationInfo = $quantityWrapper.find('.selected-variation-info');
        const $qtyInput = $quantityWrapper.find('.collin-package-qty');
        
        // Aggiorna le informazioni della variazione
        $variationInfo.html(`
            <div class="variation-price">${variationData.price_html}</div>
            ${variationData.is_disabled ? '<span class="sold-out-message">Sold Out</span>' : ''}
        `);
        
        // Configura l'input quantità
        $qtyInput.data('variation-id', variationData.variation_id);
        if (variationData.max_qty > -1) {
            $qtyInput.attr('max', variationData.max_qty);
        } else {
            $qtyInput.removeAttr('max');
        }
        
        if (variationData.is_disabled) {
            $qtyInput.prop('disabled', true);
            $quantityWrapper.find('.quantity-btn').prop('disabled', true);
        } else {
            $qtyInput.prop('disabled', false);
            $quantityWrapper.find('.quantity-btn').prop('disabled', false);
        }
        
        $quantityWrapper.show();
        
        // Aggiorna i limiti degli extra quando cambia la quantità dei pacchetti
        updateExtraLimits();
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

    // --- Gestore per input diretto quantità ---
    $('body').on('change input', '.collin-event-details-container .quantity-input', function() {
        updateExtraLimits();
        validateAddToCartButton();
    });
    
    // --- NUOVO GESTORE PER I PACCHETTI CON ATTRIBUTI ---
    $('body').on('change', '.collin-package-attribute-radio', function() {
        handlePackageAttributeSelection($(this));
    });

    // --- Gestore per TUTTI i radio button di prodotti variabili (Navetta standard E complessa) ---
    $('body').on('change', '.collin-complex-shuttle-radio', function() {
        const $radio = $(this);
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
    function validateAddToCartButton() {
        let canAddToCart = false;
        const $detailsWrapper = $(detailsContainer);
        
        if (!$detailsWrapper.length || $detailsWrapper.find('.collin-event-add-to-cart-button').length === 0) {
            $('.collin-event-add-to-cart-button').first().prop('disabled', true);
            return;
        }

        let totalQty = 0;
        
        // Conta quantità da prodotti semplici
        $detailsWrapper.find('.collin-simple-product-qty:visible:not(:disabled)').each(function() {
            totalQty += parseInt($(this).val()) || 0;
        });
        
        // Conta quantità da prodotti variabili standard
        $detailsWrapper.find('.collin-variation-qty:visible:not(:disabled)').each(function() {
            totalQty += parseInt($(this).val()) || 0;
        });
        
        // Conta quantità da pacchetti
        $detailsWrapper.find('.collin-package-qty:visible:not(:disabled)').each(function() {
            totalQty += parseInt($(this).val()) || 0;
        });
        
        canAddToCart = totalQty > 0;
        
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

                    // Inizializza i limiti degli extra
                    updateExtraLimits();
                    
                    // Inizializza Swiper per tutte le gallerie prodotto
                    const productSliders = document.querySelectorAll('.product-gallery-slider');
                    productSliders.forEach(function(sliderElement) {
                        new Swiper(sliderElement, {
                            loop: true,
                            autoplay: {
                                delay: 5000,
                                disableOnInteraction: false,
                            },
                            navigation: {
                                nextEl: sliderElement.querySelector('.swiper-button-next'),
                                prevEl: sliderElement.querySelector('.swiper-button-prev'),
                            },
                            pagination: {
                                el: sliderElement.querySelector('.swiper-pagination'),
                                clickable: true,
                            },
                            keyboard: { 
                                enabled: true,
                            },
                        });
                    });
                    
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

    // --- GESTORE CLICK PULSANTI PACCHETTO ---
    $('.collin-event-package-button').on('click', function() {
        const $clickedButton = $(this);
        const packageName = $clickedButton.text();
        const package_type = $clickedButton.data('package');
        const product_ids_str = $clickedButton.data('product-ids') ? $clickedButton.data('product-ids').toString() : "";
        
        current_event_id = $clickedButton.closest('.collin-event-packages-wrapper').data('event-id');

        $('.collin-event-package-button').removeClass('active');
        $clickedButton.addClass('active');

        loadProductDetails(product_ids_str, package_type);
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
            const $shuttleWrapper = $input.closest('.collin-shuttle-wrapper');
            let include_variation = true;
            if ($shuttleWrapper.length && $shuttleWrapper.data('shuttle-type') === 'complex') {
                const totalAttrRadios = $shuttleWrapper.find('.collin-shuttle-attribute-selection').length;
                const selectedAttrRadios = $shuttleWrapper.find('.collin-shuttle-attribute-selection input[type="radio"]:checked').length;
                if (selectedAttrRadios !== totalAttrRadios) {
                    include_variation = false;
                }
            }

            if (include_variation && !$input.is(':disabled') && quantity > 0) { 
                items_to_add.push({ product_id: $input.data('product-id'), variation_id: $input.data('variation-id'), quantity: quantity });
            }
        });
        
        // Pacchetti
        $detailsWrapper.find('.collin-package-qty').each(function() {
            const $input = $(this);
            const quantity = parseInt($input.val());
            const variationId = $input.data('variation-id');
            const productId = $input.data('product-id');
            
            if (!$input.is(':disabled') && quantity > 0 && variationId && productId) {
                items_to_add.push({ 
                    product_id: parseInt(productId), 
                    variation_id: parseInt(variationId), 
                    quantity: quantity 
                });
            }
        });

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

});
