with open('other-payments.tsx', 'rb') as f:
    raw = f.read()
text = raw.decode('latin-1')

# Reduce Note column header: 150 -> 100
text = text.replace(
    "{ width: 150, minWidth: 150, flex: 0 }]}>Note</Text>",
    "{ width: 100, minWidth: 100, flex: 0 }]}>Note</Text>"
)

# Reduce Note row cell: 150 -> 100  (payment.anouny is the note field)
text = text.replace(
    "{ width: 150, minWidth: 150, flex: 0 }]} numberOfLines={1}>{payment.anouny}</Text>",
    "{ width: 100, minWidth: 100, flex: 0 }]} numberOfLines={1}>{payment.anouny}</Text>"
)

with open('other-payments.tsx', 'wb') as f:
    f.write(text.encode('latin-1'))

print("Done. Note column reduced from 150 to 100.")
