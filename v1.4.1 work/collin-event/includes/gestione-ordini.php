<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Aggiunge il metabox alla pagina di modifica dell'ordine, compatibile con HPOS e CPT tradizionale.
 */
function collin_order_attachments_metabox() {
    // Per HPOS (High-Performance Order Storage)
    add_meta_box(
        'collin_order_attachments_metabox',
        'Biglietti Ordine (Plugin Collin Event)',
        'collin_order_attachments_callback',
        'woocommerce_page_wc-orders',
        'normal',
        'high'
    );
    // Per ordini tradizionali (come post type 'shop_order')
    add_meta_box(
        'collin_order_attachments_metabox',
        'Biglietti Ordine (Plugin Collin Event)',
        'collin_order_attachments_callback',
        'shop_order',
        'normal',
        'high'
    );
}
add_action( 'add_meta_boxes', 'collin_order_attachments_metabox' );

/**
 * Callback per renderizzare il contenuto del metabox.
 */
function collin_order_attachments_callback( $post_or_order_object ) {
    // Unifichiamo l'oggetto ordine sia che provenga da HPOS o da CPT
    $order = ( $post_or_order_object instanceof WP_Post ) ? wc_get_order( $post_or_order_object->ID ) : $post_or_order_object;
    $order_id = $order->get_id();

    // Recupera gli allegati salvati
    $attachments = get_post_meta( $order_id, '_custom_order_files', true ) ?: [];

    // Nonce di sicurezza per le nostre azioni
    wp_nonce_field( 'collin_order_attachment_nonce_action', 'collin_order_attachment_nonce' );
    ?>
    <p>
        <button id="collin_upload_media_button" class="button button-primary">Carica/Aggiungi Biglietti (PDF)</button>
    </p>
    <input type="hidden" id="collin_custom_order_files_field" name="collin_custom_order_files" value="<?php echo esc_attr(json_encode($attachments)); ?>">
    
    <h4>File associati:</h4>
    <table id="collin_attachments_list" class="widefat">
        <thead>
            <tr>
                <th>Nome File</th>
                <th>Azione</th>
            </tr>
        </thead>
        <tbody>
        <?php if (!empty($attachments)) : ?>
            <?php foreach ($attachments as $file) : ?>
                <tr>
                    <td><a href="<?php echo esc_url($file['url']); ?>" target="_blank"><?php echo esc_html($file['filename']); ?></a></td>
                    <td><button class="button collin-remove-file" data-id="<?php echo esc_attr($file['id']); ?>">Rimuovi</button></td>
                </tr>
            <?php endforeach; ?>
        <?php endif; ?>
        </tbody>
    </table>
    
    <hr style="margin-top: 20px;">
    
    <p>
        <button id="collin_send_notification_button" class="button" data-order-id="<?php echo $order_id; ?>" style="<?php echo empty($attachments) ? 'display:none;' : ''; ?>">
            Invia Email Notifica al Cliente
        </button>
        <span class="spinner" style="float:none; vertical-align: middle;"></span>
    </p>
    <p class="description">
        Clicca questo bottone per inviare un'email al cliente con i link ai biglietti qui sopra.
    </p>
    <?php
}

/**
 * Salva i metadati degli allegati quando l'ordine viene salvato.
 */
function collin_save_order_attachments_meta( $order_id ) {
    if ( ! isset($_POST['collin_order_attachment_nonce']) || ! wp_verify_nonce($_POST['collin_order_attachment_nonce'], 'collin_order_attachment_nonce_action') ) {
        return;
    }
    if ( isset($_POST['collin_custom_order_files']) ) {
        $attachments = json_decode(stripslashes($_POST['collin_custom_order_files']), true);
        $sanitized_attachments = [];
        if ( is_array($attachments) ) {
            foreach ( $attachments as $file ) {
                $sanitized_attachments[] = [
                    'id'       => absint($file['id']),
                    'filename' => sanitize_text_field($file['filename']),
                    'url'      => esc_url_raw($file['url']),
                ];
            }
        }
        update_post_meta( $order_id, '_custom_order_files', $sanitized_attachments );
    }
}
add_action( 'woocommerce_process_shop_order_meta', 'collin_save_order_attachments_meta' );

/**
 * Aggiunge l'azione "Biglietti" alla lista ordini nella pagina "Il Mio Account".
 */
function collin_add_my_account_orders_tickets_action( $actions, $order ) {
    $attachments = get_post_meta($order->get_id(), '_custom_order_files', true);
    if ( ! empty( $attachments ) ) {
        $actions['tickets'] = [
            'url'  => $order->get_view_order_url() . '#order-tickets-attachments',
            'name' => 'Visualizza Biglietti'
        ];
    }
    return $actions;
}
add_filter( 'woocommerce_my_account_my_orders_actions', 'collin_add_my_account_orders_tickets_action', 10, 2 );

/**
 * Mostra i biglietti allegati nella pagina dei dettagli dell'ordine del cliente.
 */
function collin_display_tickets_on_order_page( $order ) {
    $attachments = get_post_meta($order->get_id(), '_custom_order_files', true);
    if ( ! empty( $attachments ) ) {
        echo '<h2 id="order-tickets-attachments">I tuoi Biglietti</h2>';
        echo '<ul class="woocommerce-OrderUpdates list-unstyled">';
        foreach ($attachments as $file) {
            echo '<li class="woocommerce-OrderUpdate"><a href="' . esc_url($file['url']) . '" target="_blank" class="button btn btn-primary" download>' . 'Scarica: ' . esc_html($file['filename']) . '</a></li>';
        }
        echo '</ul>';
    }
}
add_action( 'woocommerce_order_details_after_order_table', 'collin_display_tickets_on_order_page' );

/**
 * Gestisce la richiesta AJAX per inviare l'email di notifica.
 */
function collin_event_ajax_send_ticket_notification() {
    check_ajax_referer('collin_order_attachment_nonce_action', 'nonce');

    if ( ! current_user_can('edit_shop_orders') ) {
        wp_send_json_error(['message' => 'Non hai i permessi per eseguire questa azione.']);
    }

    $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
    if ( !$order_id ) {
        wp_send_json_error(['message' => 'ID Ordine non fornito.']);
    }

    $order = wc_get_order($order_id);
    if ( !$order ) {
        wp_send_json_error(['message' => 'Ordine non trovato.']);
    }

    $attachments = get_post_meta($order_id, '_custom_order_files', true);
    if (empty($attachments)) {
        wp_send_json_error(['message' => 'Nessun biglietto allegato a questo ordine.']);
    }
    
    $customer_email = $order->get_billing_email();
    if ( !$customer_email ) {
        wp_send_json_error(['message' => 'Email del cliente non trovata.']);
    }

    $mailer = WC()->mailer();
    $email_heading = 'I tuoi biglietti sono pronti!';
    $subject = 'Biglietti pronti per l\'ordine #' . $order->get_order_number();

    ob_start();
    ?>
    <p>Ciao <?php echo esc_html($order->get_billing_first_name()); ?>,</p>
    <p>Siamo felici di comunicarti che i biglietti per il tuo ordine <strong>#<?php echo $order->get_order_number(); ?></strong> sono ora disponibili per il download.</p>
    <p>Puoi scaricarli dai seguenti link:</p>
    <ul style="list-style: none; padding: 0;">
        <?php foreach ($attachments as $file) : ?>
            <li style="margin-bottom: 10px;"><a href="<?php echo esc_url($file['url']); ?>" target="_blank" style="padding: 10px 15px; background-color: #0073aa; color: #ffffff; text-decoration: none; border-radius: 5px;"><?php echo esc_html($file['filename']); ?></a></li>
        <?php endforeach; ?>
    </ul>
    <p>Puoi anche visualizzare i dettagli completi del tuo ordine e scaricare i biglietti in qualsiasi momento dalla tua area personale sul nostro sito.</p>
    <p><a href="<?php echo esc_url($order->get_view_order_url()); ?>">Visualizza il tuo ordine</a></p>
    <p>Grazie!</p>
    <?php
    $message = ob_get_clean();
    
    $wrapped_message = $mailer->wrap_message($email_heading, $message);
    $headers = ['Content-Type: text/html; charset=UTF-t8'];
    
    $result = $mailer->send($customer_email, $subject, $wrapped_message, $headers, []);

    if ($result) {
        $order->add_order_note('Email di notifica biglietti inviata manualmente al cliente.');
        wp_send_json_success(['message' => 'Email inviata con successo.']);
    } else {
        wp_send_json_error(['message' => 'L\'invio dell\'email è fallito.']);
    }
}
add_action('wp_ajax_collin_send_ticket_notification', 'collin_event_ajax_send_ticket_notification');