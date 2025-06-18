<?php
/**
 * Template per la sezione del prodotto Hotel con gallery e descrizioni.
 *
 * Variabili disponibili:
 * @var WC_Product_Variable $product Il prodotto WooCommerce.
 * @var array $variations Le variazioni disponibili.
 */

if ( ! defined( 'ABSPATH' ) || ! isset($product) ) {
    exit; // Accesso non consentito o prodotto non definito
}

// 1. Recupera tutti i dati necessari
$short_description = $product->get_short_description();
$description       = $product->get_description();

$gallery_image_ids = $product->get_gallery_image_ids();
 
// Recupera SOLO le immagini dalla galleria prodotto
$all_image_ids = $product->get_gallery_image_ids();
?>

<?php if ( ! empty( $description ) ) : ?>
    <div class="collin-hotel-description font-bianco text-center"> 
        <?php echo wp_kses_post( wpautop( $description ) ); // wpautop aggiunge i paragrafi <p> ?>
    </div>
<?php endif; ?>

<?php if ( ! empty( $all_image_ids ) ) : ?>
    <div class="container-hotel"> 
    <div class="collin-hotel-gallery px-4">
        <div class="swiper hotel-gallery-slider">
            <div class="swiper-wrapper">
                <?php foreach ( $all_image_ids as $image_id ) : ?>
                    <div class="swiper-slide">
                        <img src="<?php echo esc_url( wp_get_attachment_image_url( $image_id, 'full' ) ); ?>" alt="<?php echo esc_attr( get_post_meta( $image_id, '_wp_attachment_image_alt', true ) ); ?>">
                    </div>
                <?php endforeach; ?>
            </div>
            <div class="swiper-pagination"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-button-next"></div>
        </div>
    </div>
<?php endif; ?>

<?php if ( ! empty( $short_description ) ) : ?>
    <div class="collin-hotel-short-description py-3 px-4">
        <h3 class="text-center uppercase black"><strong>PERNOTTAMENTO HOTEL</strong></h3>
        <hr>
        <?php echo wp_kses_post( $short_description ); ?>
    </div>
<?php endif; ?>

<div class="collin-product-item collin-hotel-product-item" data-product-id="<?php echo esc_attr( $product->get_id() ); ?>">

    <div class="collin-hotel-options-wrapper">
        <h4 class="testoPreSelect">Seleziona un'opzione:</h4>
        <?php
        foreach ( $variations as $variation_data ) {
            $variation_obj  = wc_get_product( $variation_data['variation_id'] );
            if ( !$variation_obj ) continue;
            
            $attrs = array_map(function($attr_name, $attr_value) use ($variation_obj) {
                $term = get_term_by( 'slug', $attr_value, str_replace( 'attribute_', '', $attr_name ) );
                return $term ? $term->name : esc_html(wc_attribute_label(str_replace('attribute_', '', $attr_name), $variation_obj) . ': ' . ucwords( str_replace( '-', ' ', $attr_value ) ));
            }, array_keys($variation_data['attributes']), array_values($variation_data['attributes']));
            $attributes_display = implode( ' - ', $attrs );
            
            $is_disabled = !$variation_obj->is_in_stock() || ($variation_obj->managing_stock() && $variation_obj->get_stock_quantity() !== null && $variation_obj->get_stock_quantity() <= 0);
            $max_var_qty = $variation_obj->get_max_purchase_quantity();
            if ($variation_obj->managing_stock() && $variation_obj->get_stock_quantity() !== null) {
                $stock_var_qty = $variation_obj->get_stock_quantity();
                if ($max_var_qty === -1 || ($stock_var_qty !== null && $max_var_qty > $stock_var_qty)) {
                    $max_var_qty = $stock_var_qty;
                }
            }
            
            $radio_id = 'hotel-variation-' . esc_attr( $variation_data['variation_id'] );
            ?>
            <label class="radio" for="<?php echo $radio_id; ?>">
               <input 
                type="radio" 
                class="collin-hotel-variation-radio" 
                name="hotel_variation_selection_<?php echo esc_attr($product->get_id()); ?>" 
                id="<?php echo $radio_id; ?>"
                value="<?php echo esc_attr( $variation_data['variation_id'] ); ?>"
                <?php disabled( $is_disabled, true ); ?>
                data-price-html="<?php echo esc_attr(wp_strip_all_tags(wc_price(wc_get_price_to_display($variation_obj)))); ?>"
                data-max-qty="<?php echo esc_attr($max_var_qty > -1 ? $max_var_qty : ''); ?>"
                data-variation-id="<?php echo esc_attr( $variation_data['variation_id'] ); ?>"
                data-description="<?php echo esc_attr( $variation_obj->get_description() ); // <-- RIGA AGGIUNTA ?>"
            >
                <span>
                    <?php echo esc_html( $attributes_display ); ?>
                    <?php if ( $is_disabled ) echo ' (' . esc_html__('Esaurito', 'cpe') . ')'; ?>
                </span>
            </label>
            <?php
        }
        ?>
    </div>
    <hr class="separatoreHotel" style="display:none">
    <div class="quantity-control hotel-quantity-control" style="display:none; margin-top: 15px; flex-wrap: wrap; justify-content: space-between; height: auto; align-items: center;">
        
        <div class="hotel-selection-details" style="flex-basis: 50%; min-width: 250px; line-height: 1.4;">
            <span class="variation-name selected-variation-description" style="font-weight: bold; font-size: 1.1em;text-transform:uppercase;"></span><br>
            <span class="selected-variation-name-small variation-price"></span> <span class="variation-price">-</span> <span class="variation-price variation-price-hotel"></span>
        </div>

        <div class="qnt__select" style="display: flex; align-items: center; flex-basis: 50%; min-width: 200px; justify-content: space-between;">
            <h3 class="mr-2 black" style="text-transform:capitalize; margin-bottom: 0; margin-right: 10px; font-size:1em;">Quantità</h3>
            <div class="bottoni" style="display: flex; align-items: center; flex-basis: 50%; min-width: 200px; justify-content: flex-end;">
                <button type="button" class="quantity-btn quantity-minus" aria-label="<?php esc_attr_e('Diminuisci quantità', 'cpe'); ?>">-</button>
                <input type="number" class="collin-hotel-selected-variation-qty quantity-input" value="1" min="1" name="quantity_hotel_selected_<?php echo esc_attr( $product->get_id() ); ?>" aria-label="<?php esc_attr_e('Quantità Hotel', 'cpe'); ?>">
                <button type="button" class="quantity-btn quantity-plus" aria-label="<?php esc_attr_e('Aumenta quantità', 'cpe'); ?>">+</button>
            </div>
            
        </div>
    </div>
</div>
<?php if ( ! empty( $all_image_ids ) ) : ?>
</div>
<?php endif; ?>