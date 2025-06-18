<?php
/**
 * Collin Event Attendee Names
 * VERSIONE SEMPLIFICATA: Nominativi raccolti in base alla quantità totale dei soli prodotti "Ticket"
 * (identificati da un meta campo). I nomi vengono salvati come meta sui singoli item d'ordine dei Ticket.
 */

 // 1. Mostra i campi nominativi al checkout per ogni prodotto e quantità
add_action('woocommerce_after_order_notes', 'aggiungi_campi_nominativi_checkout');
function aggiungi_campi_nominativi_checkout() {
    echo '<div class="nominativi-wrapper"><h3>' . __('Nominativi Partecipanti') . '</h3>';

    foreach (WC()->cart->get_cart() as $cart_item_key => $item) {
        $product = $item['data'];
        $qty = $item['quantity'];
        $product_id = $product->get_id();

        echo '<div class="nominativi-prodotto" style="margin-bottom:20px;">';
        echo '<strong>' . $product->get_name() . ':</strong><br>';

        for ($i = 0; $i < $qty; $i++) {
            woocommerce_form_field("nominativi_{$cart_item_key}[$i]", [
                'type'        => 'text',
                'required'    => true,
                'label'       => 'Nominativo ' . ($i + 1),
                'class'       => ['form-row-wide'],
            ], '');
        }

        echo '</div>';
    }

    echo '</div>';
}

// 2. Valida che tutti i nominativi siano stati inseriti
add_action('woocommerce_checkout_process', 'valida_nominativi_checkout');
function valida_nominativi_checkout() {
    foreach (WC()->cart->get_cart() as $cart_item_key => $item) {
        $qty = $item['quantity'];
        $field_name = "nominativi_{$cart_item_key}";
        if (!isset($_POST[$field_name]) || count(array_filter($_POST[$field_name])) < $qty) {
            wc_add_notice(__('Per favore inserisci tutti i nominativi richiesti per ' . $item['data']->get_name()), 'error');
        }
    }
}

// 3. Salva i nominativi nei metadati dell’ordine
add_action('woocommerce_checkout_create_order_line_item', 'salva_nominativi_checkout', 10, 4);
function salva_nominativi_checkout($item, $cart_item_key, $values, $order) {
    if (isset($_POST["nominativi_{$cart_item_key}"])) {
        $nominativi = array_map('sanitize_text_field', $_POST["nominativi_{$cart_item_key}"]);
        $item->add_meta_data('Nominativi', implode(', ', $nominativi));
    }
}

// 4. Mostra i nominativi in email, thank you page e backend
/*add_action('woocommerce_order_item_meta_end', 'mostra_nominativi_ovunque', 10, 4);
function mostra_nominativi_ovunque($item_id, $item, $order, $plain_text) {
    $nominativi = wc_get_order_item_meta($item_id, 'Nominativi');
    if ($nominativi) {
        echo '<p><strong>' . __('Nominativi') . ':</strong> ' . esc_html($nominativi) . '</p>';
    }
}*/
add_filter('woocommerce_order_item_display_meta_key', function($key) {
    return $key === 'Nominativi' ? 'Biglietti intestati a' : $key;
});

add_filter('woocommerce_display_item_meta', 'mostra_nominativi_backend_tabella', 10, 3);
function mostra_nominativi_backend_tabella($html, $item, $args) {
    if (is_admin() && $item instanceof WC_Order_Item_Product) {
        $nominativi = $item->get_meta('Nominativi');
        if ($nominativi) {
            $html .= '<br><strong>' . __('Nominativi') . ':</strong> ' . esc_html($nominativi);
        }
    }
    return $html;
}

add_action('admin_menu', function() {
    add_submenu_page('woocommerce', 'Esporta nominativi', 'Esporta nominativi', 'manage_woocommerce', 'esporta-nominativi', 'esporta_nominativi_csv');
});

function esporta_nominativi_csv() {
    if (!current_user_can('manage_woocommerce')) return;

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment;filename=nominativi.csv');

    $output = fopen('php://output', 'w');
    fputcsv($output, ['ID Ordine', 'Prodotto', 'Nominativi']);

    $orders = wc_get_orders(['limit' => -1]);
    foreach ($orders as $order) {
        foreach ($order->get_items() as $item) {
            $nominativi = $item->get_meta('Nominativi');
            if (is_array($nominativi)) $nominativi = implode(', ', $nominativi);
            fputcsv($output, [$order->get_id(), $item->get_name(), $nominativi]);
        }
    }

    fclose($output);
    exit;
}


