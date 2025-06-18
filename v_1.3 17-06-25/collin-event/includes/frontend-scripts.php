<?php
// File: includes/frontend-scripts.php

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}
 
/**
 * Carica gli script e gli stili per il frontend (lato pubblico).
 */
function collin_event_enqueue_frontend_assets() {
    // Carica lo script JavaScript principale del plugin
    wp_enqueue_script('collin-event-frontend', CE_PLUGIN_URL . 'assets/js/frontend.js', array( 'jquery' ), time(), true );
    
    // Carica il foglio di stile CSS principale del plugin
    wp_enqueue_style( 'ets-frontend-style', CE_PLUGIN_URL . 'assets/css/frontend.css', array(), time() );
    
    // Aggiunge il CSS di Swiper da un CDN (se usato dallo shortcode)
    wp_enqueue_style( 'swiper-css', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css' );

    // Aggiunge il JS di Swiper da un CDN
    wp_enqueue_script( 'swiper-js', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js', array(), null, true );

    // Localizza gli script solo se siamo su una pagina di un singolo evento
    if ( is_singular('event') ) {
        $event_page_id = get_the_ID(); 
        $ticket_prod_id = get_post_meta( $event_page_id, '_ticket_product_id', true );
        $hotel_prod_id = get_post_meta( $event_page_id, '_hotel_product_id', true );
        
        wp_localize_script('collin-event-frontend', 'collin_event_ajax_obj', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('collin_event_ajax_nonce'),
            'ticket_product_id' => absint($ticket_prod_id),
            'shuttle_product_id' => absint(get_post_meta( $event_page_id, '_shuttle_product_id', true )),
            'hotel_product_id' => absint($hotel_prod_id),
            'cart_url' => wc_get_cart_url(),
            // ... tutti gli altri testi localizzati ...
        ));

        // Carica la libreria lightbox Fancybox solo dove serve
        wp_enqueue_style( 'fancybox-css', 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css' );
        wp_enqueue_script( 'fancybox-js', 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js', [], null, true );
        wp_add_inline_script( 'fancybox-js', "document.addEventListener('DOMContentLoaded', function() { Fancybox.bind('[data-fancybox=\"event-gallery\"]'); });" );
    }
}
add_action('wp_enqueue_scripts', 'collin_event_enqueue_frontend_assets');

// In un file di plugin principale, o dove stai mettendo in coda frontend.js
function collin_event_enqueue_scripts() {
 // Dati per il frontend.js
    wp_localize_script( 'collin-event-frontend-js', 'collin_event_ajax_obj', array(
        'ajax_url'                   => admin_url( 'admin-ajax.php' ),
        'nonce'                      => wp_create_nonce( 'collin_event_ajax_nonce' ),
        'cart_url'                   => wc_get_cart_url(),
        'ticket_product_id'          => get_post_meta( get_the_ID(), '_ticket_product_id', true ), // Assicurati che questo sia corretto per l'ID del ticket principale
        'loading_text'               => esc_html__( 'Caricamento Pacchetto...', 'cpe' ),
        'adding_to_cart_text'        => esc_html__( 'Aggiungendo...', 'cpe' ),
        'add_to_cart_text'           => esc_html__( 'Aggiungi al Carrello', 'cpe' ),
        'error_load_text'            => esc_html__( 'Errore caricamento prodotti.', 'cpe' ),
        'error_add_cart_text'        => esc_html__( 'Errore durante l\'aggiunta al carrello.', 'cpe' ),
        'error_ajax_text'            => esc_html__( 'Errore AJAX.', 'cpe' ),
        'checking_cart_text'         => esc_html__( 'Verifica carrello in corso...', 'cpe' ),
        'conflict_choice_title'      => esc_html__( 'Conflitto Ticket nel Carrello', 'cpe' ),
        'conflict_choice_text'       => esc_html__( 'Hai già un ticket per questo evento nel carrello. Se desideri acquistare questo pacchetto, il ticket esistente verrà rimosso.', 'cpe' ),
        'conflict_choice_btn_cart'   => esc_html__( 'Vai al Carrello', 'cpe' ),
        'conflict_choice_btn_package'=> esc_html__( 'Passa al Pacchetto', 'cpe' ),
        'removing_ticket_text'       => esc_html__( 'Rimozione ticket in corso...', 'cpe' ),
        'error_remove_ticket_fail_text' => esc_html__( 'Impossibile rimuovere il ticket esistente. Si prega di rimuoverlo manualmente dal carrello e riprovare.', 'cpe' ),
        'error_nonce_fail_text'      => esc_html__( 'Errore di sicurezza o richiesta non valida. Riprova o contatta l\'assistenza.', 'cpe' ),
        'sold_out_text'              => esc_html__( 'Sold Out', 'cpe' ),
        'decrease_qty_text'          => esc_html__( 'Diminuisci quantità', 'cpe' ),
        'increase_qty_text'          => esc_html__( 'Aumenta quantità', 'cpe' ),
        'qty_for_text'               => esc_html__( 'Quantità per', 'cpe' ),
        // Questo sarà popolato solo quando richiesto via AJAX per un prodotto complesso
        'product_variations_data'    => array(), // Verrà riempito dalla chiamata AJAX loadProductDetails
    ));
}
add_action( 'wp_enqueue_scripts', 'collin_event_enqueue_scripts' );