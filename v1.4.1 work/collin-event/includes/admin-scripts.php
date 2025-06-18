<?php
// File: includes/admin-scripts.php

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Carica gli script e gli stili necessari solo nel pannello di amministrazione.
 */
function collin_event_enqueue_admin_scripts( $hook ) {
    global $post;
    
    $current_screen = get_current_screen();

    // Carica script per la pagina di modifica EVENTO
    if ( is_object($current_screen) && $current_screen->id === 'event' && ($hook === 'post.php' || $hook === 'post-new.php') ) {
        wp_enqueue_media();
        wp_enqueue_script('jquery-ui-sortable');
        wp_enqueue_script( 'collin-event-admin', CE_PLUGIN_URL . 'assets/js/admin.js', ['jquery', 'jquery-ui-sortable'], time(), true );
        wp_enqueue_style( 'collin-event-admin-style', CE_PLUGIN_URL . 'assets/css/admin.css', [], time() );
    }

    // Carica script per la pagina di modifica ORDINE (HPOS e tradizionale)
    if ( is_object($current_screen) && ($current_screen->id === 'shop_order' || strpos($current_screen->id, 'wc-orders') !== false) ) {
        wp_enqueue_media(); // Necessario per il media uploader
        wp_enqueue_script( 'collin-admin-ordini', CE_PLUGIN_URL . 'assets/js/admin-ordini.js', ['jquery'], time(), true );
    }
}
add_action( 'admin_enqueue_scripts', 'collin_event_enqueue_admin_scripts' );