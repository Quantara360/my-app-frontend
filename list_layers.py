from psd_tools import PSDImage

psd = PSDImage.open(r'C:\xampp1\htdocs\MyFirstProject (1)\Template.psd')

def print_layers(layers, indent=0):
    for i, layer in enumerate(layers):
        print(f"{'  '*indent}[{i}] kind={layer.kind} name=\"{layer.name}\" visible={layer.is_visible()} bbox={layer.bbox}")
        if hasattr(layer, '__iter__'):
            print_layers(layer, indent+1)

print_layers(psd)
