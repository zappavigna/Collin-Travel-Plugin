<?php
// Nasconde il form standard per prodotti variabili
add_filter('woocommerce_is_sold_individually', function($return, $product) {
    if ($product->is_type('variable')) {
        return true;
    }
    return $return;
}, 10, 2);

// Rimuove il bottone standard per prodotti variabili
add_action('woocommerce_single_product_summary', function () {
    global $product;
    if ($product->is_type('variable')) {
        remove_action('woocommerce_single_variation', 'woocommerce_single_variation_add_to_cart_button', 20);
    }
}, 1);

// Mostra form personalizzato: checkbox per varianti + quantità unica
add_action('woocommerce_single_product_summary', 'mostra_form_varianti_quantita_unica', 30);
function mostra_form_varianti_quantita_unica() {
    global $product;

    if (!$product->is_type('variable')) return;

    $variations = $product->get_available_variations();
    if (empty($variations)) return;

    echo '<form method="post">';
    echo '<div class="date-checkbox-group"><p><strong>Seleziona le date dell\'evento:</strong></p>';

    /*
    foreach ($variations as $variation) {
        $id = $variation['variation_id'];
        $label = implode(', ', array_map('ucfirst', $variation['attributes']));
            echo '<div style="margin-bottom:8px;">';
            echo '<label><input type="checkbox" name="date_variants[]" value="' . esc_attr($id) . '"> ' . $label . '</label>';
        echo '</div>';
    }
    */ 
    foreach ($variations as $variation) {
        $id = $variation['variation_id'];
        $label_text = implode(', ', array_map('ucfirst', $variation['attributes']));
        echo '<div style="margin-bottom:8px;" class="checkbox-wrapper-29">';
        echo '  <label class="checkbox">';
        echo '    <input type="checkbox" class="checkbox__input" name="date_variants[]" value="' . esc_attr($id) . '" id="date_variants_' . esc_attr($id) . '" />';
        echo '    <span class="checkbox__label"></span>';
        echo '    ' . $label_text;
        echo '  </label>';
        echo '</div>';
    }

    echo '<p><strong>Quantità per ciascuna data selezionata:</strong></p>';
    echo '<input type="number" name="quantita_globale" min="1" value="1" style="width:60px;" />';
    echo '<br><br><button type="submit" class="single_add_to_cart_button button alt">Aggiungi al carrello</button>';
    echo '</form>';
}

// Aggiunge tutte le varianti selezionate al carrello con quantità unica
add_action('template_redirect', 'aggiungi_varianti_quantita_unica_custom');
function aggiungi_varianti_quantita_unica_custom() {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['date_variants']) && is_array($_POST['date_variants'])) {
        $quantita = isset($_POST['quantita_globale']) ? max(1, intval($_POST['quantita_globale'])) : 1;
        $redirect_url = wc_get_cart_url();

        foreach ($_POST['date_variants'] as $variation_id) {
            $variation_id = intval($variation_id);
            $variation = wc_get_product($variation_id);

            if ($variation && $variation->is_type('variation')) {
                $parent_id = $variation->get_parent_id();
                WC()->cart->add_to_cart($parent_id, $quantita, $variation_id, $variation->get_attributes(), [
                    'aggiunto_da_form_custom' => true,
                ]);
            }
        }

        wp_safe_redirect($redirect_url);
        exit;
    }
}

 


?>
