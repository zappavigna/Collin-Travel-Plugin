jQuery(document).ready(function($) {

    // --- NUOVO --- Gestione Uploader PDF Lineup ---
    var pdfUploader;

    $('body').on('click', '.collin-upload-pdf-button', function(e) {
        e.preventDefault();
        var button = $(this);
        var pdf_id_field = $('#lineup_pdf_id');
        var preview_container = $('.collin-lineup-preview');

        if (pdfUploader) {
            pdfUploader.open();
            return;
        }

        pdfUploader = wp.media.frames.file_frame = wp.media({
            title: 'Scegli il PDF della Lineup',
            button: {
                text: 'Usa questo PDF'
            },
            library: {
                type: 'application/pdf' // Filtra per mostrare solo i PDF
            },
            multiple: false // Permetti la selezione di un solo file
        });

        pdfUploader.on('select', function() {
            var attachment = pdfUploader.state().get('selection').first().toJSON();
            
            // Aggiorna il campo nascosto con l'ID del PDF
            pdf_id_field.val(attachment.id);

            // Genera l'anteprima del file
            var preview_html = `
                <div class="lineup-preview-item">
                    <span class="dashicons dashicons-media-document"></span>
                    <strong>File attuale:</strong> 
                    <a href="${attachment.url}" target="_blank">${attachment.filename}</a>
                    <a href="#" class="collin-remove-pdf-button" title="Rimuovi PDF" style="text-decoration: none; margin-left: 10px;">
                        <span class="dashicons dashicons-no"></span>
                    </a>
                </div>`;
            
            preview_container.html(preview_html);
        });

        pdfUploader.open();
    });

    // --- NUOVO --- Rimuovere il PDF selezionato
    $('body').on('click', '.collin-remove-pdf-button', function(e) {
        e.preventDefault();
        // Svuota il campo nascosto
        $('#lineup_pdf_id').val('');
        // Rimuovi l'anteprima
        $('.collin-lineup-preview').html('');
    });


    // --- ESISTENTE --- Gestione della Galleria di Immagini
    var mediaUploader;

    $('body').on('click', '.collin-upload-gallery-button', function(e) {
        e.preventDefault();
        var button = $(this);
        var image_ids_field = button.prev('.collin-gallery-ids');
        var preview_container = button.next('.collin-gallery-preview');

        // Se l'uploader esiste già, aprilo
        // NOTA: è importante non riutilizzare `mediaUploader` della galleria per il PDF e viceversa.
        // Avendo scope diversi (pdfUploader vs mediaUploader) non ci sono conflitti.
        if (mediaUploader) {
            mediaUploader.open();
            return;
        }

        mediaUploader = wp.media.frames.file_frame = wp.media({
            title: 'Scegli le immagini per la galleria',
            button: {
                text: 'Usa queste immagini'
            },
            multiple: true // Abilita la selezione multipla
        });

        mediaUploader.on('select', function() {
            var selection = mediaUploader.state().get('selection');
            var ids = [];
            var preview_html = '';

            selection.map(function(attachment) {
                attachment = attachment.toJSON();
                ids.push(attachment.id);
                // Assicurati che esista la thumbnail, altrimenti usa un'immagine di fallback o non mostrare nulla
                var image_url = attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url;
                preview_html += '<div class="gallery-preview-item"><img src="' + image_url + '" /><span class="remove-image" data-id="' + attachment.id + '">&times;</span></div>';
            });
            
            image_ids_field.val(ids.join(','));
            preview_container.html(preview_html);
        });

        mediaUploader.open();
    });

    // Rimuovere un'immagine dalla preview della galleria
    $('body').on('click', '.collin-gallery-preview .remove-image', function() {
        var image_id_to_remove = $(this).data('id').toString();
        var preview_item = $(this).closest('.gallery-preview-item');
        var preview_container = preview_item.closest('.collin-gallery-preview');
        var image_ids_field = preview_container.siblings('.collin-gallery-ids');
        
        var current_ids = image_ids_field.val().split(',');
        var new_ids = current_ids.filter(id => id !== image_id_to_remove);
        
        image_ids_field.val(new_ids.join(','));
        preview_item.remove();
    });


    // Gestione delle FAQ Repeater (codice esistente invariato)
    $('#collin-faq-repeater').on('click', '.add-faq-row', function() {
        var row = $('.faq-row.empty-row').clone(true);
        row.removeClass('empty-row').addClass('faq-item');
        row.insertBefore('.faq-row.empty-row');
        // Ricalcola gli indici per i name degli input
        updateFaqIndexes();
    });

    $('#collin-faq-repeater').on('click', '.remove-faq-row', function() {
        $(this).closest('.faq-item').remove();
        updateFaqIndexes();
    });
    
    function updateFaqIndexes() {
        $('#collin-faq-repeater .faq-item').each(function(index) {
            $(this).find('.faq-question').attr('name', 'faq_data[' + index + '][question]');
            $(this).find('.faq-answer').attr('name', 'faq_data[' + index + '][answer]');
        });
    }
    
    // Rendi le righe delle FAQ ordinabili
    if (typeof $.fn.sortable !== 'undefined') {
        $('#collin-faq-repeater').sortable({
            handle: '.faq-handle',
            opacity: 0.7,
            stop: function() {
                updateFaqIndexes();
            }
        });
    }

});