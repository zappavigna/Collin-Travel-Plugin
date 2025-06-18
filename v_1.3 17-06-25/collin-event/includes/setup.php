<?php
// File: includes/setup.php

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Registra il Custom Post Type 'FAQ' e la sua tassonomia 'Categorie FAQ'.
 */
function collin_event_register_faq_post_type() {

    // Etichette per il CPT FAQ
    $labels_cpt = array(
        'name'                  => _x( 'FAQ', 'Post Type General Name', 'collin-event' ),
        'singular_name'         => _x( 'FAQ', 'Post Type Singular Name', 'collin-event' ),
        'menu_name'             => __( 'FAQ', 'collin-event' ),
        'name_admin_bar'        => __( 'FAQ', 'collin-event' ),
        'all_items'             => __( 'Tutte le FAQ', 'collin-event' ),
        'add_new_item'          => __( 'Aggiungi Nuova FAQ', 'collin-event' ),
        'add_new'               => __( 'Aggiungi Nuova', 'collin-event' ),
        'edit_item'             => __( 'Modifica FAQ', 'collin-event' ),
        // ... altre etichette se necessario ...
    );
    $args_cpt = array(
        'label'                 => __( 'FAQ', 'collin-event' ),
        'description'           => __( 'Domande e risposte frequenti', 'collin-event' ),
        'labels'                => $labels_cpt,
        'supports'              => array( 'title', 'editor', 'revisions', 'page-attributes' ),
        'hierarchical'          => false,
        'public'                => true,
        'show_ui'               => true,
        'show_in_menu'          => true,
        'menu_position'         => 20,
        'menu_icon'             => 'dashicons-editor-help',
        'show_in_admin_bar'     => true,
        'can_export'            => true,
        'has_archive'           => false,
        'exclude_from_search'   => true,
        'publicly_queryable'    => true,
        'capability_type'       => 'post',
        'rewrite'               => array( 'slug' => 'faq' ),
    );
    register_post_type( 'faq', $args_cpt );

    // Etichette per la Tassonomia 'Categorie FAQ'
    $labels_tax = array(
        'name'              => _x( 'Categorie FAQ', 'taxonomy general name', 'collin-event' ),
        'singular_name'     => _x( 'Categoria FAQ', 'taxonomy singular name', 'collin-event' ),
        'all_items'         => __( 'Tutte le Categorie', 'collin-event' ),
        'edit_item'         => __( 'Modifica Categoria', 'collin-event' ),
        'update_item'       => __( 'Aggiorna Categoria', 'collin-event' ),
        'add_new_item'      => __( 'Aggiungi Nuova Categoria', 'collin-event' ),
        'new_item_name'     => __( 'Nuovo Nome Categoria', 'collin-event' ),
        'menu_name'         => __( 'Categorie FAQ', 'collin-event' ),
    );
    $args_tax = array(
        'hierarchical'      => true,
        'labels'            => $labels_tax,
        'show_ui'           => true,
        'show_admin_column' => true,
        'query_var'         => true,
        'rewrite'           => array( 'slug' => 'faq-category' ),
    );
    register_taxonomy( 'faq_category', array( 'faq' ), $args_tax );
}
add_action( 'init', 'collin_event_register_faq_post_type', 0 );

/**
 * Aggiunge il campo "Ordine" al form di creazione di una nuova categoria FAQ.
 */
function collin_add_faq_category_order_field() {
    ?>
    <div class="form-field">
        <label for="term_order">Ordine</label>
        <input type="number" name="term_order" id="term_order" value="0" style="width: 100px;">
        <p class="description">Inserisci un numero per ordinare le categorie. Valori più bassi vengono prima.</p>
    </div>
    <?php
}
add_action( 'faq_category_add_form_fields', 'collin_add_faq_category_order_field', 10, 2 );

/**
 * Aggiunge il campo "Ordine" al form di modifica di una categoria FAQ esistente.
 */
function collin_edit_faq_category_order_field($term) {
    $term_order = get_term_meta( $term->term_id, '_term_order', true );
    if ( ! $term_order ) $term_order = 0;
    ?>
    <tr class="form-field">
        <th scope="row" valign="top"><label for="term_order">Ordine</label></th>
        <td>
            <input type="number" name="term_order" id="term_order" value="<?php echo esc_attr($term_order); ?>" style="width: 100px;">
            <p class="description">Inserisci un numero per ordinare le categorie. Valori più bassi vengono prima.</p>
        </td>
    </tr>
    <?php
}
add_action( 'faq_category_edit_form_fields', 'collin_edit_faq_category_order_field', 10, 2 );

/**
 * Salva il valore del campo "Ordine" quando una categoria FAQ viene creata o modificata.
 */
function collin_save_faq_category_order_field( $term_id ) {
    if ( isset( $_POST['term_order'] ) ) {
        update_term_meta( $term_id, '_term_order', absint($_POST['term_order']) );
    }
}
add_action( 'created_faq_category', 'collin_save_faq_category_order_field', 10, 2 );
add_action( 'edited_faq_category', 'collin_save_faq_category_order_field', 10, 2 );