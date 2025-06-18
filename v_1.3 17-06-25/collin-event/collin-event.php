<?php
/**
 * Plugin Name: Collin Event
 * Description: Gestisce eventi, prodotti WooCommerce associati e funzionalità di acquisto.
 * Version: 1.2.0
 * Author: Tuo Nome
 * Text Domain: collin-event
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Controlla se WooCommerce è attivo, altrimenti mostra un avviso.
 */
if ( ! in_array( 'woocommerce/woocommerce.php', apply_filters( 'active_plugins', get_option( 'active_plugins' ) ) ) ) {
    add_action( 'admin_notices', 'collin_event_admin_notice_woocommerce_missing' );
    return;
}
function collin_event_admin_notice_woocommerce_missing() {
    echo '<div class="notice notice-error"><p>Il plugin **Collin Event** richiede **WooCommerce** per funzionare correttamente. Si prega di installare e attivare WooCommerce.</p></div>';
}

/**
 * Definisce le costanti del plugin.
 */
define( 'CE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'CE_PLUGIN_VERSION', '1.2.0' );

/**
 * Carica tutti i file necessari per il funzionamento del plugin.
 * Questo è il "centralino" principale.
 */
require_once CE_PLUGIN_DIR . 'includes/setup.php';                 // Per CPT e Tassonomie
require_once CE_PLUGIN_DIR . 'includes/metaboxes.php';             // Per i box nella pagina di modifica
require_once CE_PLUGIN_DIR . 'includes/frontend-scripts.php';      // Script e stili del lato pubblico
require_once CE_PLUGIN_DIR . 'includes/admin-scripts.php';         // Script e stili del lato admin
require_once CE_PLUGIN_DIR . 'includes/shortcode.php';             // Per gli shortcode
require_once CE_PLUGIN_DIR . 'includes/checkout-ticket-names.php'; // Gestione nominativi al checkout
require_once CE_PLUGIN_DIR . 'includes/gestione-ordini.php';       // Nuova gestione allegati agli ordini