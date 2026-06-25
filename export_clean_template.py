from psd_tools import PSDImage

psd = PSDImage.open(r'C:\xampp1\htdocs\MyFirstProject (1)\Template.psd')

# Hide specific layers that contain dynamic data
layers_to_hide = list(range(10, 56)) + [6, 7, 8, 56, 57, 58, 59, 60, 61, 65]

for i, layer in enumerate(psd):
    if i in layers_to_hide:
        layer.visible = False

img = psd.composite(ignore_preview=True)
img.save(r'C:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\assets\images\id_card_template_clean.png')
print('Clean template saved!')
