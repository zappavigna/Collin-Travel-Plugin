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