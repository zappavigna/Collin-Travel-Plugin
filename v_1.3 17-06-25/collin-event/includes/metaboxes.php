<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Registra tutti i metabox necessari per il plugin.
 */
function collin_event_add_all_metaboxes() {
    
    // --- METABOX PER IL POST TYPE 'event' ---
    add_meta_box( 'collin_event_product_links', 'Prodotti WooCommerce Collegati', 'collin_event_render_product_links_metabox', 'event', 'side', 'high' );
    add_meta_box( 'collin_event_faq_category', 'Collega Categoria FAQ', 'collin_event_render_faq_category_metabox', 'event', 'side', 'default' );
    add_meta_box( 'collin_event_video_url', 'URL Video Hero', 'collin_event_render_video_url_metabox', 'event', 'normal', 'high' );
    add_meta_box( 'collin_event_product_message', 'Messaggio Aggiuntivo Prodotto', 'collin_event_render_product_message_metabox', 'event', 'normal', 'default' );
    add_meta_box( 'collin_event_festival_details', 'Il Festival', 'collin_event_render_festival_metabox', 'event', 'normal', 'default' );
    add_meta_box( 'collin_event_lineup_pdf', 'Lineup (PDF)', 'collin_event_render_lineup_pdf_metabox', 'event', 'normal', 'default' );
    add_meta_box( 'collin_event_gallery', 'Galleria Evento', 'collin_event_render_gallery_metabox', 'event', 'normal', 'low' );

    // --- METABOX PER IL POST TYPE 'product' ---
    add_meta_box( 'collin_event_product_type', 'Tipo di Prodotto Evento', 'collin_event_render_product_type_metabox', 'product', 'side', 'default' );
    add_meta_box( 'collin_event_linked_page', 'Evento Collegato', 'collin_event_render_linked_event_metabox', 'product', 'side', 'default' );
}
add_action( 'add_meta_boxes', 'collin_event_add_all_metaboxes' );


// --- FUNZIONI DI RENDERING PER I METABOX ---

function collin_event_render_video_url_metabox( $post ) {
    $video_url = get_post_meta( $post->ID, '_hero_video_url', true );
    ?>
    <p>
        <label for="hero_video_url"><strong>URL del video di sfondo (es. MP4 da Media Library):</strong></label>
    </p>
    <p>
        <input type="url" id="hero_video_url" name="hero_video_url" value="<?php echo esc_url( $video_url ); ?>" style="width:100%;" placeholder="https://tuosito.com/video.mp4">
    </p>
    <p class="description">
        Inserisci l'URL completo di un video (preferibilmente in formato .mp4). Se questo campo è compilato, il video sostituirà l'immagine in evidenza nella sezione hero.
    </p>
    <?php
}

function collin_event_render_product_links_metabox( $post ) {
    wp_nonce_field( 'collin_event_save_metaboxes', 'collin_event_metabox_nonce' );
    $ticket_product_id  = get_post_meta( $post->ID, '_ticket_product_id', true );
    $shuttle_product_id = get_post_meta( $post->ID, '_shuttle_product_id', true );
    $hotel_product_id   = get_post_meta( $post->ID, '_hotel_product_id', true );
    $products = wc_get_products( array( 'limit' => -1, 'orderby' => 'title', 'order' => 'ASC' ) );
    ?>
    <p><label for="ticket_product_id"><strong>Ticket:</strong></label><br><select id="ticket_product_id" name="ticket_product_id" style="width:100%;"><option value="">-- Seleziona --</option><?php foreach($products as $p){printf('<option value="%s"%s>%s</option>',esc_attr($p->get_id()),selected($ticket_product_id,$p->get_id(),false),esc_html($p->get_name()));}?></select></p>
    <p><label for="shuttle_product_id"><strong>Navetta:</strong></label><br><select id="shuttle_product_id" name="shuttle_product_id" style="width:100%;"><option value="">-- Seleziona --</option><?php foreach($products as $p){printf('<option value="%s"%s>%s</option>',esc_attr($p->get_id()),selected($shuttle_product_id,$p->get_id(),false),esc_html($p->get_name()));}?></select></p>
    <p><label for="hotel_product_id"><strong>Hotel:</strong></label><br><select id="hotel_product_id" name="hotel_product_id" style="width:100%;"><option value="">-- Seleziona --</option><?php foreach($products as $p){printf('<option value="%s"%s>%s</option>',esc_attr($p->get_id()),selected($hotel_product_id,$p->get_id(),false),esc_html($p->get_name()));}?></select></p>
    <?php
}

function collin_event_render_faq_category_metabox( $post ) {
    $selected_cat_id = get_post_meta( $post->ID, '_event_faq_category_id', true );
    $faq_categories = get_terms( array( 'taxonomy' => 'faq_category', 'hide_empty' => false, 'parent' => 0) );
    ?>
    <p><label for="event_faq_category_id">Seleziona un gruppo di FAQ da mostrare:</label></p>
    <select name="event_faq_category_id" id="event_faq_category_id" style="width:100%;">
        <option value="">-- Nessuna --</option>
        <?php if ( !empty($faq_categories) && !is_wp_error($faq_categories) ) : ?>
            <?php foreach ( $faq_categories as $category ) : ?>
                <option value="<?php echo esc_attr($category->term_id); ?>" <?php selected($selected_cat_id, $category->term_id); ?>><?php echo esc_html($category->name); ?></option>
            <?php endforeach; ?>
        <?php endif; ?>
    </select>
    <?php
}

function collin_event_render_product_message_metabox( $post ) {
    $product_message = get_post_meta( $post->ID, '_product_message', true );
    ?><p><label for="product_message"><strong>Messaggio visualizzato sopra la selezione del pacchetto:</strong></label></p><p><textarea id="product_message" name="product_message" rows="2" style="width:100%;"><?php echo esc_textarea( $product_message ); ?></textarea></p><?php
}

function collin_event_render_festival_metabox( $post ) {
    $festival_details = get_post_meta( $post->ID, '_festival_details_text', true );
    ?><p><label for="festival_details_text"><strong>Dettagli sul festival (es. lineup, info utili):</strong></label></p><p><textarea id="festival_details_text" name="festival_details_text" rows="5" style="width:100%;"><?php echo esc_textarea( $festival_details ); ?></textarea></p><?php
}

function collin_event_render_lineup_pdf_metabox( $post ) {
    $pdf_id = get_post_meta( $post->ID, '_lineup_pdf_id', true );
    $pdf_url = wp_get_attachment_url($pdf_id);
    $pdf_filename = $pdf_url ? basename($pdf_url) : '';
    ?>
    <div id="collin-lineup-wrapper">
        <p>Carica o seleziona un file PDF per la lineup.</p>
        <input type="hidden" id="lineup_pdf_id" name="lineup_pdf_id" value="<?php echo esc_attr( $pdf_id ); ?>">
        <button type="button" class="button collin-upload-pdf-button">Carica/Seleziona PDF</button>
        <div class="collin-lineup-preview" style="margin-top: 15px;">
            <?php if ( $pdf_id && $pdf_url ) : ?>
                <div class="lineup-preview-item">
                    <span class="dashicons dashicons-media-document"></span>
                    <strong>File attuale:</strong> 
                    <a href="<?php echo esc_url($pdf_url); ?>" target="_blank"><?php echo esc_html($pdf_filename); ?></a>
                    <a href="#" class="collin-remove-pdf-button" title="Rimuovi PDF" style="text-decoration: none; margin-left: 10px;">
                        <span class="dashicons dashicons-no"></span>
                    </a>
                </div>
            <?php endif; ?>
        </div>
    </div>
    <?php
}


function collin_event_render_gallery_metabox( $post ) {
    $image_ids_str = get_post_meta( $post->ID, '_event_gallery_ids', true );
    $image_ids = !empty($image_ids_str) ? explode(',', $image_ids_str) : [];
    ?><div id="collin-gallery-wrapper"><input type="hidden" class="collin-gallery-ids" name="event_gallery_ids" value="<?php echo esc_attr( $image_ids_str ); ?>"><button type="button" class="button collin-upload-gallery-button">Aggiungi/Modifica Galleria</button><div class="collin-gallery-preview"><?php foreach ( $image_ids as $id ) { $image_url = wp_get_attachment_image_url( $id, 'thumbnail' ); if ( $image_url ) { printf('<div class="gallery-preview-item"><img src="%s" /><span class="remove-image" data-id="%s">&times;</span></div>', esc_url($image_url), esc_attr($id)); } } ?></div></div><?php
}

function collin_event_render_product_type_metabox( $post ) {
    $product_type = get_post_meta( $post->ID, '_ets_product_type', true );
    // *** MODIFICA INIZIO ***
    $is_complex_shuttle = get_post_meta( $post->ID, '_is_complex_shuttle', true );
    // *** MODIFICA FINE ***

    $options = array( 'biglietti' => 'Biglietti', 'navetta' => 'Navetta', 'hotel' => 'Hotel' );
    
    echo '<p><strong>Seleziona il tipo (per logica interna):</strong></p>';
    foreach ( $options as $value => $label ) {
        echo '<p><label><input type="radio" name="ets_product_type" value="' . esc_attr( $value ) . '" ' . checked( $product_type, $value, false ) . ' /> ' . esc_html( $label ) . '</label></p>';
    }

    // *** MODIFICA INIZIO: NUOVA CHECKBOX ***
    echo '<hr style="margin-top:15px; margin-bottom:15px;">';
    echo '<div id="complex-shuttle-option" ' . ($product_type === 'navetta' ? '' : 'style="display:none;"') . '>';
    echo '<p><label><input type="checkbox" name="is_complex_shuttle" value="yes" ' . checked( $is_complex_shuttle, 'yes', false ) . ' /> <strong>È una navetta con orari A/R</strong></label></p>';
    echo '<p class="description">Attiva l\'interfaccia avanzata per navette che richiedono la selezione di orari di andata e ritorno (oltre a data e/o luogo).</p>';
    echo '</div>';

    // Piccolo script per mostrare/nascondere la checkbox
    wc_enqueue_js("
        jQuery(function($) {
            function toggleComplexShuttleOption() {
                if ($('input[name=\"ets_product_type\"]:checked').val() === 'navetta') {
                    $('#complex-shuttle-option').show();
                } else {
                    $('#complex-shuttle-option').hide();
                    $('#complex-shuttle-option input[type=\"checkbox\"]').prop('checked', false);
                }
            }
            // Init
            toggleComplexShuttleOption();
            // On change
            $('input[name=\"ets_product_type\"]').on('change', toggleComplexShuttleOption);
        });
    ");
    // *** MODIFICA FINE ***
}

function collin_event_render_linked_event_metabox( $post ) {
    $linked_event_id = get_post_meta( $post->ID, '_ets_linked_event_id', true );
    $events = get_posts( array( 'post_type' => 'event', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC' ) );
    ?><p><strong>Seleziona l'evento a cui questo prodotto appartiene:</strong></p><select name="ets_linked_event_id" style="width:100%;"><option value="">-- Seleziona un evento --</option><?php foreach ( $events as $event ) {?><option value="<?php echo esc_attr( $event->ID ); ?>" <?php selected( $linked_event_id, $event->ID ); ?>><?php echo esc_html( $event->post_title ); ?></option><?php } ?></select><?php
}

// --- FUNZIONE DI SALVATAGGIO UNIFICATA ---
function collin_event_save_all_metabox_data( $post_id, $post ) {
    // Gestione salvataggio per i metabox del prodotto (che non hanno il nonce nel loro box)
    if ( $post->post_type == 'product' && current_user_can('edit_post', $post_id) ) {
        if ( isset( $_POST['ets_product_type'] ) ) { 
            update_post_meta( $post_id, '_ets_product_type', sanitize_text_field( $_POST['ets_product_type'] ) ); 
        }
        if ( isset( $_POST['ets_linked_event_id'] ) ) { 
            update_post_meta( $post_id, '_ets_linked_event_id', absint( $_POST['ets_linked_event_id'] ) ); 
        }
        // *** MODIFICA INIZIO: SALVATAGGIO NUOVA CHECKBOX ***
        if ( isset( $_POST['is_complex_shuttle'] ) && $_POST['ets_product_type'] === 'navetta' ) {
            update_post_meta( $post_id, '_is_complex_shuttle', 'yes' );
        } else {
            delete_post_meta( $post_id, '_is_complex_shuttle' );
        }
        // *** MODIFICA FINE ***
    }

    // Gestione salvataggio per i metabox dell'evento (che hanno il nonce)
    if ( !isset( $_POST['collin_event_metabox_nonce'] ) || !wp_verify_nonce( $_POST['collin_event_metabox_nonce'], 'collin_event_save_metaboxes' ) ) {
        return;
    }
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    if ( $post->post_type == 'event' ) {
        if (isset($_POST['ticket_product_id'])) { update_post_meta($post_id, '_ticket_product_id', absint($_POST['ticket_product_id'])); }
        if (isset($_POST['shuttle_product_id'])) { update_post_meta($post_id, '_shuttle_product_id', absint($_POST['shuttle_product_id'])); }
        if (isset($_POST['hotel_product_id'])) { update_post_meta($post_id, '_hotel_product_id', absint($_POST['hotel_product_id'])); }
        if (isset($_POST['product_message'])) { update_post_meta($post_id, '_product_message', sanitize_textarea_field($_POST['product_message'])); }
        if (isset($_POST['festival_details_text'])) { update_post_meta($post_id, '_festival_details_text', sanitize_textarea_field($_POST['festival_details_text'])); }
        if (isset($_POST['lineup_pdf_id'])) { update_post_meta($post_id, '_lineup_pdf_id', absint($_POST['lineup_pdf_id'])); }
        if (isset($_POST['event_gallery_ids'])) { update_post_meta($post_id, '_event_gallery_ids', implode(',', array_map('absint', explode(',', $_POST['event_gallery_ids']))));}
        if (isset($_POST['event_faq_category_id'])) { update_post_meta( $post_id, '_event_faq_category_id', absint( $_POST['event_faq_category_id'] ) );}
        if (isset($_POST['hero_video_url'])) { update_post_meta($post_id, '_hero_video_url', esc_url_raw($_POST['hero_video_url'])); }
    }
}
add_action( 'save_post', 'collin_event_save_all_metabox_data', 10, 2 );