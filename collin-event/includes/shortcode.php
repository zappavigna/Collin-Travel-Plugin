<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Funzione per registrare lo shortcode
function collin_event_register_shortcode() {
    add_shortcode( 'collin_event_packages', 'collin_event_render_packages_shortcode' );
}
add_action( 'init', 'collin_event_register_shortcode' );

// Funzione per renderizzare i pulsanti iniziali dei pacchetti
function collin_event_render_packages_shortcode( $atts ) {
    $post_id = get_the_ID();
    $ticket_product_id  = get_post_meta( $post_id, '_ticket_product_id', true );
    $shuttle_product_id = get_post_meta( $post_id, '_shuttle_product_id', true );
    $hotel_product_id   = get_post_meta( $post_id, '_hotel_product_id', true );

    ob_start();
    if ( ! $ticket_product_id && ! $shuttle_product_id && ! $hotel_product_id ) {
        echo '<p class="messaggio text-center font-bianco"> Data l’alta richiesta di pacchetti per il festival, al momento non ci sono pacchetti disponibili online.<br> Contattaci per richiedere un pacchetto su misura per le tue esigenze</p>';
        return ob_get_clean();
    }

    // Funzione helper per controllare lo stato di stock di un prodotto
    // Considera un prodotto sold out se non è in stock o se ha 0 quantità disponibile e gestisce lo stock.
    $is_product_sold_out = function( $product_id ) {
        if ( ! $product_id ) {
            return true; // Se l'ID non esiste, consideralo sold out per la logica del pacchetto completo
        }
        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            return true; // Prodotto non trovato, consideralo sold out
        }
        if ( ! $product->is_in_stock() ) {
            return true;
        }
        if ( $product->managing_stock() && $product->get_stock_quantity() !== null && $product->get_stock_quantity() <= 0 ) {
            return true;
        }
        
        // Per prodotti variabili, controlla se *tutte* le variazioni sono sold out
        if ( $product->is_type( 'variable' ) ) {
            $variations = $product->get_available_variations();
            if ( empty( $variations ) ) {
                return true; // Nessuna variazione disponibile
            }
            $all_variations_sold_out = true;
            foreach ( $variations as $variation_data ) {
                $variation_obj = wc_get_product( $variation_data['variation_id'] );
                if ( $variation_obj && $variation_obj->is_in_stock() && ( ! $variation_obj->managing_stock() || $variation_obj->get_stock_quantity() === null || $variation_obj->get_stock_quantity() > 0 ) ) {
                    $all_variations_sold_out = false;
                    break;
                }
            }
            return $all_variations_sold_out;
        }

        return false;
    };

    // Costruisci l'array dei product ID per il pacchetto completo in modo sicuro
    $complete_package_product_ids_raw = [];
    $is_complete_package_sold_out = false;

    if ($ticket_product_id) {
        $complete_package_product_ids_raw[] = $ticket_product_id;
        if ($is_product_sold_out($ticket_product_id)) {
            $is_complete_package_sold_out = true;
        }
    }
    if ($shuttle_product_id) {
        $complete_package_product_ids_raw[] = $shuttle_product_id;
        if ($is_product_sold_out($shuttle_product_id)) {
            $is_complete_package_sold_out = true;
        }
    }
    if ($hotel_product_id) {
        $complete_package_product_ids_raw[] = $hotel_product_id;
        if ($is_product_sold_out($hotel_product_id)) {
            $is_complete_package_sold_out = true;
        }
    }
    
    $complete_package_product_ids = array_filter(array_map('absint', $complete_package_product_ids_raw));
    $complete_package_ids_str = implode(',', $complete_package_product_ids);

    // Pacchetto Navetta + Hotel - verifica sold out anche qui
    $shuttle_hotel_ids = [];
    $is_shuttle_hotel_package_sold_out = false;
    if ($shuttle_product_id) {
        $shuttle_hotel_ids[] = $shuttle_product_id;
        if ($is_product_sold_out($shuttle_product_id)) {
            $is_shuttle_hotel_package_sold_out = true;
        }
    }
    if ($hotel_product_id) {
        $shuttle_hotel_ids[] = $hotel_product_id;
        if ($is_product_sold_out($hotel_product_id)) {
            $is_shuttle_hotel_package_sold_out = true;
        }
    }
    $shuttle_hotel_ids_str = implode(',', array_filter(array_map('absint', $shuttle_hotel_ids)));

    ?>
    <div class="collin-event-packages-wrapper" data-event-id="<?php echo esc_attr( $post_id ); ?>">
        <div class="collin-event-buttons-container">
            <?php if ( $ticket_product_id ) : ?>
                <button class="collin-event-package-button" data-package="ticket" data-product-ids="<?php echo esc_attr( $ticket_product_id ); ?>"><?php esc_html_e( 'Ticket', 'cpe' ); ?></button>
            <?php endif; ?>
            <?php if ( $shuttle_product_id ) : ?>
                <button class="collin-event-package-button" data-package="shuttle" data-product-ids="<?php echo esc_attr( $shuttle_product_id ); ?>"><?php esc_html_e( 'Navetta', 'cpe' ); ?></button>
            <?php endif; ?>
            <?php 
            if ( count($shuttle_hotel_ids) >= 2 && $shuttle_product_id && $hotel_product_id && !$is_shuttle_hotel_package_sold_out ) :
            ?>
                <button class="collin-event-package-button" data-package="shuttle_hotel" data-product-ids="<?php echo esc_attr( $shuttle_hotel_ids_str ); ?>"><?php esc_html_e( 'Navetta + Hotel', 'cpe' ); ?></button>
            <?php endif; ?>
            <?php if ( count($complete_package_product_ids) > 1 && !$is_complete_package_sold_out ) : // Mostra "Completo" solo se ci sono almeno due prodotti distinti e nessuno è sold out ?>
                <button class="collin-event-package-button" data-package="complete_package" data-product-ids="<?php echo esc_attr( $complete_package_ids_str ); ?>"><?php esc_html_e( 'Completo', 'cpe' ); ?></button>
            <?php endif; ?>
        </div>
        <div class="collin-event-details-container">
            </div>
        </div>
    <?php
    return ob_get_clean();
}

// Funzione AJAX per ottenere dettagli prodotto/varianti
function collin_event_ajax_get_product_variations() {
    check_ajax_referer( 'collin_event_ajax_nonce', 'nonce' );

    $product_ids_str = isset( $_POST['product_ids'] ) ? sanitize_text_field( $_POST['product_ids'] ) : '';
    $event_id        = isset( $_POST['event_id'] ) ? absint( $_POST['event_id'] ) : 0;
    $package_type_slug = isset( $_POST['package_type'] ) ? sanitize_key( $_POST['package_type'] ) : '';
    
    $product_ids     = array_filter( array_map( 'absint', explode( ',', $product_ids_str ) ) );

    if ( empty( $product_ids ) || ! $event_id ) {
        wp_send_json_error( array('message' => __('Nessun ID prodotto o ID evento fornito.', 'cpe') ) );
    }

    $event_title = $event_id ? get_the_title( $event_id ) : '';
    $hotel_product_id_from_meta = get_post_meta( $event_id, '_hotel_product_id', true ); // Usato per identificare il prodotto hotel

    $output_html = '';

    foreach ( $product_ids as $product_id ) {
        $product = wc_get_product( $product_id );
        if ( ! $product ) continue;

        $is_hotel_product = ( (int) $product_id === (int) $hotel_product_id_from_meta );
        
        $output_html .= '<div class="collin-event-product-section" data-product-id="' . esc_attr( $product_id ) . '">';
        $output_html .= '<h3>' . esc_html( $product->get_name() ) . '</h3><hr>';

        if ( $product->is_type( 'simple' ) ) {
            $max_qty_simple = $product->get_max_purchase_quantity();
            if ($product->managing_stock() && $product->get_stock_quantity() !== null) {
                $stock_qty_simple = $product->get_stock_quantity();
                if ($max_qty_simple === -1 || ($stock_qty_simple !== null && $max_qty_simple > $stock_qty_simple)) {
                    $max_qty_simple = $stock_qty_simple;
                }
            }
            $is_simple_disabled = !$product->is_in_stock() || ($product->managing_stock() && $product->get_stock_quantity() !== null && $product->get_stock_quantity() <= 0);

            $output_html .= '<div class="collin-product-item collin-simple-product-item" data-product-id="' . esc_attr( $product_id ) . '">';
            $output_html .= ' <div class="product-info">';
            $output_html .= '  <span class="product-name">' . esc_html( $product->get_name() ) . '</span>';
            $output_html .= '  <span class="product-price">' . wp_kses_post( $product->get_price_html() ) . '</span>';
            if ($is_simple_disabled) {
                $output_html .= '  <span class="sold-out-message">' . esc_html__('Sold Out', 'cpe') . '</span>';
            }
            $output_html .= ' </div>';
            $output_html .= ' <div class="quantity-control">';
            $output_html .= '  <button type="button" class="quantity-btn quantity-minus" aria-label="' . esc_attr__('Diminuisci quantità', 'cpe') . '"' . ($is_simple_disabled ? ' disabled' : '') . '>-</button>';
            $output_html .= '  <input type="number" class="collin-simple-product-qty quantity-input" value="0" min="0" ';
            if ( $max_qty_simple > -1 ) $output_html .= 'max="' . esc_attr( $max_qty_simple ) . '" ';
            if ( $is_simple_disabled ) $output_html .= 'disabled ';
            $output_html .= 'data-product-id="' . esc_attr( $product_id ) . '" name="quantity_simple_' . esc_attr( $product_id ) . '" aria-label="' . esc_attr__('Quantità per', 'cpe') . ' ' . esc_attr($product->get_name()) . '">';
            $output_html .= '  <button type="button" class="quantity-btn quantity-plus" aria-label="' . esc_attr__('Aumenta quantità', 'cpe') . '"' . ($is_simple_disabled ? ' disabled' : '') . '>+</button>';
            $output_html .= ' </div>';
            $output_html .= '</div>';

        } elseif ( $product->is_type( 'variable' ) ) {
            $variations = $product->get_available_variations();
            $attributes = $product->get_variation_attributes();

            $location_attribute_slug = 'pa_luogo-di-partenza';

            if ( !empty($variations) && isset($attributes[$location_attribute_slug]) ) {
                // NUOVA GESTIONE PER NAVETTA CON LUOGHI E DATE
                $grouped_variations = [];
                foreach ($variations as $variation) {
                    $location_slug = $variation['attributes']['attribute_' . $location_attribute_slug];
                    $grouped_variations[$location_slug][] = $variation;
                }

                $output_html .= '<div class="collin-shuttle-wrapper">';
                $output_html .= '<h4>Scegli il luogo di partenza:</h4>';
                $output_html .= '<div class="collin-shuttle-locations-wrapper">';
                foreach ($grouped_variations as $location_slug => $location_variations) {
                    $term = get_term_by('slug', $location_slug, $location_attribute_slug);
                    $location_name = $term ? $term->name : ucfirst($location_slug);
                    $radio_id = 'location-' . esc_attr($location_slug) . '-' . esc_attr($product_id);

                    $output_html .= '<label class="collin-shuttle-location-label radio" for="' . $radio_id . '">';
                    $output_html .= '<input type="radio" class="collin-shuttle-location-radio" name="shuttle_location_' . esc_attr($product_id) . '" id="' . $radio_id . '" value="' . esc_attr($location_slug) . '">';
                    $output_html .= '<span>' . esc_html($location_name) . '</span>';
                    $output_html .= '</label>';
                }
                $output_html .= '</div>';

                $output_html .= '<div class="collin-shuttle-dates-wrapper">';
                foreach ($grouped_variations as $location_slug => $location_variations) {
                    $output_html .= '<div class="collin-shuttle-dates-container" data-location="' . esc_attr($location_slug) . '" style="display:none;">';
                    $output_html .= '<h4>Seleziona la data:</h4>';

                    foreach ($location_variations as $variation_data) {
                        $variation_obj = wc_get_product( $variation_data['variation_id'] );
                        if ( !$variation_obj ) continue;

                        // --- INIZIO BLOCCO DI CODICE CORRETTO ---
                        $date_attribute_full_key = '';
                        // Trova dinamicamente la chiave dell'attributo della data
                        foreach (array_keys($variation_data['attributes']) as $key) {
                            if ($key !== 'attribute_' . $location_attribute_slug) {
                                $date_attribute_full_key = $key;
                                break;
                            }
                        }

                        if (empty($date_attribute_full_key)) {
                            // Se per qualche motivo non troviamo l'attributo data, saltiamo
                            continue;
                        }

                        $date_taxonomy_name = str_replace('attribute_', '', $date_attribute_full_key);
                        $date_slug = $variation_data['attributes'][$date_attribute_full_key] ?? '';
                        $date_term = get_term_by('slug', $date_slug, $date_taxonomy_name);
                        $attributes_display = $date_term ? $date_term->name : ucfirst($date_slug);
                        // --- FINE BLOCCO DI CODICE CORRETTO ---

                        $max_qty_var = $variation_obj->get_max_purchase_quantity();
                        if ($variation_obj->managing_stock() && $variation_obj->get_stock_quantity() !== null) {
                            $stock_qty_var = $variation_obj->get_stock_quantity();
                            if ($max_qty_var === -1 || ($stock_qty_var !== null && $max_qty_var > $stock_qty_var)) {
                                $max_qty_var = $stock_qty_var;
                            }
                        }
                        $is_var_disabled = !$variation_obj->is_in_stock() || ($variation_obj->managing_stock() && $variation_obj->get_stock_quantity() !== null && $variation_obj->get_stock_quantity() <= 0);

                        // Recupera la descrizione della variazione
                        $variation_description = $variation_obj->get_description();

                        $output_html .= '<div class="collin-variation-item" data-variation-id="' . esc_attr( $variation_data['variation_id'] ) . '" data-product-id="' . esc_attr( $product_id ) . '">';
                        $output_html .= ' <div class="variation-info">';
                        $output_html .= '  <span class="variation-name">' . esc_html( $attributes_display ) . '</span><br>';

                        // Aggiungi la descrizione della variazione qui
                        if ( ! empty( $variation_description ) ) {
                            $output_html .= '  <span class="variation-description"><i class="fas fa-info-circle"></i> ' . wp_kses_post( $variation_description ) . '</span><br>';
                        }

                        $output_html .= '  <span class="variation-price">' . wp_kses_post( $variation_obj->get_price_html() ) . '</span>';
                        if ($is_var_disabled) {
                            $output_html .= '<span class="sold-out-message">' . esc_html__('Sold Out', 'cpe') . '</span>';
                        }
                        $output_html .= ' </div>';
                        $output_html .= ' <div class="quantity-control">';
                        $output_html .= '  <button type="button" class="quantity-btn quantity-minus" aria-label="' . esc_attr__('Diminuisci quantità', 'cpe') . '"' . ($is_var_disabled ? ' disabled' : '') . '>-</button>';
                        $output_html .= '  <input type="number" class="collin-variation-qty quantity-input" value="0" min="0" ';
                        if ( $max_qty_var > -1 ) $output_html .= 'max="' . esc_attr( $max_qty_var ) . '" ';
                        if ( $is_var_disabled ) $output_html .= 'disabled ';
                        $output_html .= 'data-variation-id="' . esc_attr( $variation_data['variation_id'] ) . '" data-product-id="' . esc_attr( $product_id ) . '" name="quantity_variation_' . esc_attr( $variation_data['variation_id'] ) . '" aria-label="' . esc_attr__('Quantità per', 'cpe') . ' ' . esc_attr($attributes_display) . '">';
                        $output_html .= '  <button type="button" class="quantity-btn quantity-plus" aria-label="' . esc_attr__('Aumenta quantità', 'cpe') . '"' . ($is_var_disabled ? ' disabled' : '') . '>+</button>';
                        $output_html .= ' </div>';
                        $output_html .= '</div>';
                    }
                    $output_html .= '</div>';
                }
                $output_html .= '</div>';
                $output_html .= '</div>'; 
            } else { // GESTIONE STANDARD per prodotti variabili (es. Hotel o Ticket)
                if ( empty( $variations ) ) {
                    $output_html .= '<p>' . esc_html__('Nessuna opzione disponibile per questo prodotto.', 'cpe') . '</p>';
                } else {
                    if ( $is_hotel_product ) {
                        ob_start();
                        include( plugin_dir_path( __FILE__ ) . 'template-parts/product-section-variable-hotel.php' );
                        $output_html .= ob_get_clean();
                    } else { 
                        $output_html .= '<div class="collin-product-item collin-other-variable-product-item" data-product-id="' . esc_attr( $product_id ) . '">';
                        foreach ( $variations as $variation_data ) {
                            $variation_obj  = wc_get_product( $variation_data['variation_id'] );
                            if ( !$variation_obj ) continue;
                            $attrs = array_map(function($attr_name, $attr_value) use ($variation_obj) { 
                                $term = get_term_by( 'slug', $attr_value, str_replace( 'attribute_', '', $attr_name ) ); 
                                return $term ? $term->name : esc_html(wc_attribute_label(str_replace('attribute_', '', $attr_name), $variation_obj) . ': ' . ucwords( str_replace( '-', ' ', $attr_value ) ));
                            }, array_keys($variation_data['attributes']), array_values($variation_data['attributes']));
                            $attributes_display = implode( ' - ', $attrs );
                            
                            $max_qty_var = $variation_obj->get_max_purchase_quantity();
                            if ($variation_obj->managing_stock() && $variation_obj->get_stock_quantity() !== null) {
                                   $stock_qty_var = $variation_obj->get_stock_quantity();
                                   if ($max_qty_var === -1 || ($stock_qty_var !== null && $max_qty_var > $stock_qty_var)) {
                                       $max_qty_var = $stock_qty_var;
                                   }
                            }
                            $is_var_disabled = !$variation_obj->is_in_stock() || ($variation_obj->managing_stock() && $variation_obj->get_stock_quantity() !== null && $variation_obj->get_stock_quantity() <= 0);

                            $output_html .= '<div class="collin-variation-item" data-variation-id="' . esc_attr( $variation_data['variation_id'] ) . '" data-product-id="' . esc_attr( $product_id ) . '">';
                            $output_html .= ' <div class="variation-info">';
                            $output_html .= '  <span class="variation-name">' . esc_html( $attributes_display ) . '</span><br>';
                            $output_html .= '  <span class="variation-price">' . wp_kses_post( $variation_obj->get_price_html() ) . '</span>';
                            if ($is_var_disabled) {
                                   $output_html .= '<span class="sold-out-message">' . esc_html__('Sold Out', 'cpe') . '</span>';
                            }
                            $output_html .= ' </div>';
                            $output_html .= ' <div class="quantity-control">';
                            $output_html .= '  <button type="button" class="quantity-btn quantity-minus" aria-label="' . esc_attr__('Diminuisci quantità', 'cpe') . '"' . ($is_var_disabled ? ' disabled' : '') . '>-</button>';
                            $output_html .= '  <input type="number" class="collin-variation-qty quantity-input" value="0" min="0" ';
                            if ( $max_qty_var > -1 ) $output_html .= 'max="' . esc_attr( $max_qty_var ) . '" ';
                            if ( $is_var_disabled ) $output_html .= 'disabled ';
                            $output_html .= 'data-variation-id="' . esc_attr( $variation_data['variation_id'] ) . '" data-product-id="' . esc_attr( $product_id ) . '" name="quantity_variation_' . esc_attr( $variation_data['variation_id'] ) . '" aria-label="' . esc_attr__('Quantità per', 'cpe') . ' ' . esc_attr($attributes_display) . '">';
                            $output_html .= '  <button type="button" class="quantity-btn quantity-plus" aria-label="' . esc_attr__('Aumenta quantità', 'cpe') . '"' . ($is_var_disabled ? ' disabled' : '') . '>+</button>';
                            $output_html .= ' </div>';
                            $output_html .= '</div>';
                        }
                        $output_html .= '</div>';
                    }
                }
            }
        }
        $output_html .= '</div>';
    }

    $output_html .= '<div class="collin-event-cart-actions">';
    $output_html .= ' <button class="collin-event-add-to-cart-button" disabled>' . esc_html__('Aggiungi al Carrello', 'cpe') . '</button>';
    $output_html .= '</div>';

    wp_send_json_success( array( 'html' => $output_html ) );
}
add_action( 'wp_ajax_collin_event_get_product_variations', 'collin_event_ajax_get_product_variations' );
add_action( 'wp_ajax_nopriv_collin_event_get_product_variations', 'collin_event_ajax_get_product_variations' );


// Funzione AJAX per aggiungere prodotti multipli al carrello
function collin_event_ajax_add_to_cart_multiple() {
    check_ajax_referer( 'collin_event_ajax_nonce', 'nonce' );

    $items_data = isset( $_POST['data'] ) ? json_decode( stripslashes( $_POST['data'] ), true ) : array();

    if ( empty( $items_data ) ) {
        wp_send_json_error( array( 'message' => __('Nessun dato fornito per l\'aggiunta al carrello.', 'cpe') ) );
        return;
    }

    $added_to_cart_count = 0;
    $error_messages = array();
    $cart_item_data = array();

    foreach ( $items_data as $item ) {
        $product_id   = isset( $item['product_id'] ) ? absint( $item['product_id'] ) : 0;
        $quantity     = isset( $item['quantity'] ) ? absint( $item['quantity'] ) : 0;
        $variation_id = isset( $item['variation_id'] ) ? absint( $item['variation_id'] ) : 0;

        if ( ! $product_id || $quantity <= 0 ) {
            continue;
        }

        $product_to_add_id = $product_id;
        $variation_to_add_id = $variation_id;
        
        $product_obj = wc_get_product( $variation_id ? $variation_id : $product_id );

        if ( ! $product_obj ) {
            $error_messages[] = sprintf( __('Prodotto ID %d non trovato.', 'cpe'), $variation_id ? $variation_id : $product_id );
            continue;
        }
        
        if ($product_obj->is_type('variation')) {
            $product_to_add_id = $product_obj->get_parent_id();
        } else {
            $variation_to_add_id = 0;
        }


        if ( ! $product_obj->is_in_stock() ) {
            $error_messages[] = sprintf( __('%s non è disponibile.', 'cpe'), $product_obj->get_name() );
            continue;
        }

        if ( $product_obj->managing_stock() && ! $product_obj->has_enough_stock( $quantity ) ) {
            $error_messages[] = sprintf( __('Stock insufficiente per %s. Richiesti %d, disponibili %d.', 'cpe'), $product_obj->get_name(), $quantity, $product_obj->get_stock_quantity() );
            continue;
        }
        
        $max_purchase_qty = $product_obj->get_max_purchase_quantity();
        if ($max_purchase_qty > -1 && $quantity > $max_purchase_qty) {
               $error_messages[] = sprintf( __('Puoi acquistare al massimo %d unità di %s.', 'cpe'), $max_purchase_qty, $product_obj->get_name() );
            continue;
        }


        $result = WC()->cart->add_to_cart( $product_to_add_id, $quantity, $variation_to_add_id, array(), $cart_item_data );

        if ( ! $result ) {
            $error_messages[] = sprintf( __('Errore durante l\'aggiunta di %s al carrello.', 'cpe'), $product_obj->get_name() );
        } else {
            $added_to_cart_count++;
        }
    }

    if ( $added_to_cart_count > 0 && empty( $error_messages ) ) {
        wp_send_json_success( array( 
            'message' => sprintf( _n('%d prodotto aggiunto al carrello con successo!', '%d prodotti aggiunti al carrello con successo!', $added_to_cart_count, 'cpe'), $added_to_cart_count ),
            'cart_url' => wc_get_cart_url() 
        ) );
    } elseif ( $added_to_cart_count > 0 && !empty( $error_messages ) ) {
        wp_send_json_success( array( 
            'message' => sprintf( _n('Aggiunto %d prodotto, ma ci sono stati problemi: ', 'Aggiunti %d prodotti, ma ci sono stati problemi: ', $added_to_cart_count, 'cpe'), $added_to_cart_count ) . implode(" ", $error_messages),
            'cart_url' => wc_get_cart_url(), 
            'partial_success' => true 
        ) );
    } else {
        $final_error_msg = __('Errore durante l\'aggiunta dei prodotti al carrello.', 'cpe');
        if ( !empty( $error_messages ) ) {
            $final_error_msg = implode(" ", $error_messages);
        }
        wp_send_json_error( array( 'message' => $final_error_msg ) );
    }
}
add_action( 'wp_ajax_collin_event_add_to_cart_multiple', 'collin_event_ajax_add_to_cart_multiple' );
add_action( 'wp_ajax_nopriv_collin_event_add_to_cart_multiple', 'collin_event_ajax_add_to_cart_multiple' );


// Funzione AJAX per controllare se un ticket è nel carrello (per la logica di conflitto)
function collin_event_ajax_check_ticket_in_cart() {
    check_ajax_referer( 'collin_event_ajax_nonce', 'nonce' );
    $ticket_product_id_to_check = isset( $_POST['ticket_product_id'] ) ? absint( $_POST['ticket_product_id'] ) : 0;
    $ticket_in_cart = false;
    $debug_info = ['checked_id' => $ticket_product_id_to_check, 'status' => 'ID to check is 0 or WC/Cart not available.'];

    if ( $ticket_product_id_to_check > 0 && function_exists('WC') && WC()->cart && !WC()->cart->is_empty() ) {
        $ticket_obj_to_check = wc_get_product( $ticket_product_id_to_check );
        $debug_info['status'] = 'Ticket object to check retrieved.';
        $debug_info['ticket_obj_type'] = $ticket_obj_to_check ? $ticket_obj_to_check->get_type() : 'not_found';

        if ( $ticket_obj_to_check ) {
            foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
                $product_in_cart_id = $cart_item['product_id'];
                $variation_in_cart_id = $cart_item['variation_id'];

                if ( $ticket_obj_to_check->is_type('variation') ) {
                    if ( $variation_in_cart_id == $ticket_product_id_to_check ) {
                        $ticket_in_cart = true;
                        $debug_info['match_type'] = 'variation_id_match';
                        $debug_info['matched_cart_item_key'] = $cart_item_key;
                        break;
                    }
                } elseif ( $ticket_obj_to_check->is_type('variable') ) {
                    if ( $product_in_cart_id == $ticket_product_id_to_check && $variation_in_cart_id > 0 ) {
                        $ticket_in_cart = true;
                        $debug_info['match_type'] = 'parent_id_match_for_variation_in_cart';
                        $debug_info['matched_cart_item_key'] = $cart_item_key;
                        $debug_info['matched_variation_in_cart_id'] = $variation_in_cart_id;
                        break;
                    }
                } else {
                    if ( $product_in_cart_id == $ticket_product_id_to_check && $variation_in_cart_id == 0 ) {
                        $ticket_in_cart = true;
                        $debug_info['match_type'] = 'simple_product_id_match';
                        $debug_info['matched_cart_item_key'] = $cart_item_key;
                        break;
                    }
                }
            }
            if (!$ticket_in_cart) {
                $debug_info['status'] = 'Ticket object processed, no match found in cart items.';
            } else {
                $debug_info['status'] = 'Ticket object processed, MATCH FOUND in cart.';
            }
        } else {
            $debug_info['status'] = 'Ticket object to check (ID: ' . $ticket_product_id_to_check . ') not found as a valid product.';
        }
    }
    wp_send_json_success( array( 'ticket_in_cart' => $ticket_in_cart, 'debug' => $debug_info ) );
}
add_action( 'wp_ajax_collin_event_check_ticket_in_cart', 'collin_event_ajax_check_ticket_in_cart' );
add_action( 'wp_ajax_nopriv_collin_event_check_ticket_in_cart', 'collin_event_ajax_check_ticket_in_cart' );

// Funzione AJAX per rimuovere un ticket dal carrello (per la logica di conflitto)
 function collin_event_ajax_remove_ticket_from_cart() {
    // check_ajax_referer( 'collin_event_ajax_nonce', 'nonce' ); // <--- METTI // ALL'INIZIO DI QUESTA RIGA

    $ticket_product_id_to_remove = isset( $_POST['ticket_product_id'] ) ? absint( $_POST['ticket_product_id'] ) : 0;
    $removed_count = 0;
    $ticket_name = ''; 

    if ( $ticket_product_id_to_remove > 0 && function_exists('WC') && WC()->cart && !WC()->cart->is_empty() ) {
        $ticket_obj_to_remove = wc_get_product($ticket_product_id_to_remove); 

        if ($ticket_obj_to_remove) {
            $ticket_name = $ticket_obj_to_remove->get_name();
        } else {
            $ticket_name = sprintf(__('Ticket ID %d', 'cpe'), $ticket_product_id_to_remove);
        }

        foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
            $match = false;
            $item_in_cart_product_id = $cart_item['product_id']; 
            $item_in_cart_variation_id = $cart_item['variation_id']; 

            if ( $ticket_obj_to_remove ) { 
                if ( $ticket_obj_to_remove->is_type('variation') ) {
                    if ( $item_in_cart_variation_id == $ticket_product_id_to_remove ) {
                        $match = true;
                    }
                } elseif ( $ticket_obj_to_remove->is_type('variable') ) {
                    if ( $item_in_cart_product_id == $ticket_product_id_to_remove && $item_in_cart_variation_id > 0 ) {
                        $match = true;
                    }
                } else { 
                    if ( $item_in_cart_product_id == $ticket_product_id_to_remove && $item_in_cart_variation_id == 0 ) {
                        $match = true;
                    }
                }
            }

            if ($match) {
                WC()->cart->remove_cart_item( $cart_item_key );
                $removed_count++;
            }
        }
    }

    if ( $removed_count > 0 ) {
        wp_send_json_success( array( 
            'message' => sprintf( __('%s (e/o le sue varianti) è stato rimosso dal carrello.', 'cpe'), esc_html($ticket_name) ),
            'product_id' => $ticket_product_id_to_remove,
            'removed_count' => $removed_count
        ) );
    } else {
        wp_send_json_error( array( 
            'message' => sprintf( __('%s non trovato nel carrello o nessuna istanza rimossa.', 'cpe'), esc_html($ticket_name) ),
            'product_id' => $ticket_product_id_to_remove
        ) );
    }
}
add_action( 'wp_ajax_collin_event_ajax_remove_ticket_from_cart', 'collin_event_ajax_remove_ticket_from_cart' );
add_action( 'wp_ajax_nopriv_collin_event_ajax_remove_ticket_from_cart', 'collin_event_ajax_remove_ticket_from_cart' );