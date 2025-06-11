jQuery(document).ready(function($) {
    let frame;

    // 1. Gestione apertura Media Library
    $('body').on('click', '#collin_upload_media_button', function(e) {
        e.preventDefault();

        if (frame) {
            frame.open();
            return;
        }

        frame = wp.media({
            title: 'Seleziona o Carica i Biglietti',
            multiple: true,
            library: { type: 'application/pdf' }, // Limita a PDF, puoi cambiare o rimuovere
            button: { text: 'Aggiungi i file selezionati' }
        });

        frame.on('select', function() {
            const selection = frame.state().get('selection').toArray();
            let currentFiles = JSON.parse($('#collin_custom_order_files_field').val() || '[]');
            
            selection.forEach(function(attachment) {
                if (!currentFiles.some(file => file.id === attachment.id)) {
                    currentFiles.push({
                        id: attachment.id,
                        filename: attachment.attributes.filename,
                        url: attachment.attributes.url
                    });
                }
            });

            updateFileList(currentFiles);
        });

        frame.open();
    });

    // 2. Gestione rimozione file
    $('body').on('click', '.collin-remove-file', function(e) {
        e.preventDefault();
        const fileID = $(this).data('id');
        let currentFiles = JSON.parse($('#collin_custom_order_files_field').val());
        
        currentFiles = currentFiles.filter(file => file.id !== fileID);
        
        updateFileList(currentFiles);
    });

    // 3. Gestione invio email di notifica via AJAX
    $('body').on('click', '#collin_send_notification_button', function(e) {
        e.preventDefault();
        const button = $(this);
        const spinner = button.siblings('.spinner');
        const orderId = button.data('order-id');

        button.prop('disabled', true);
        spinner.css('visibility', 'visible');

        $.ajax({
            url: ajaxurl, // ajaxurl è una variabile globale di WordPress
            type: 'POST',
            data: {
                action: 'collin_send_ticket_notification',
                order_id: orderId,
                nonce: $('#collin_order_attachment_nonce').val()
            },
            success: function(response) {
                if (response.success) {
                    alert('Email di notifica inviata con successo al cliente!');
                } else {
                    alert('Errore: ' + response.data.message);
                }
            },
            error: function() {
                alert('Errore di comunicazione con il server.');
            },
            complete: function() {
                button.prop('disabled', false);
                spinner.css('visibility', 'hidden');
            }
        });
    });

    // Funzione helper per aggiornare la lista file e il campo hidden
    function updateFileList(files) {
        const tableBody = $('#collin_attachments_list tbody');
        tableBody.empty();
        
        if (files.length > 0) {
            files.forEach(function(file) {
                tableBody.append(`
                    <tr>
                        <td><a href="${file.url}" target="_blank">${file.filename}</a></td>
                        <td><button class="button collin-remove-file" data-id="${file.id}">Rimuovi</button></td>
                    </tr>
                `);
            });
            $('#collin_send_notification_button').show();
        } else {
             $('#collin_send_notification_button').hide();
        }

        $('#collin_custom_order_files_field').val(JSON.stringify(files));
    }
});