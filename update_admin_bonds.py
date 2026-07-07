import os
import re

target_file = r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Bonds to adminCards
bonds_card = """    {
      id: "8",
      title: "Manage Site",
      value: null,
      icon: "🏢",
      backgroundColor: "#ffd1dc",
      textColor: "#1f1d21",
    },
    {
      id: "9",
      title: "Bonds",
      value: null,
      icon: "📜",
      backgroundColor: "#d1c4e9",
      textColor: "#1f1d21",
    },"""
content = content.replace("""    {
      id: "8",
      title: "Manage Site",
      value: null,
      icon: "🏢",
      backgroundColor: "#ffd1dc",
      textColor: "#1f1d21",
    },""", bonds_card)

# 2. Update handleCardPress to handle Bonds
handle_card_bonds = """    } else if (card.title === "Bonds") {
      router.push("/bonds");
    } else {"""
content = content.replace("    } else {", handle_card_bonds)

# 3. Add the render slice for 8 to 10
slice_6_8 = """        <View style={styles.cardsRow}>
          {adminCards.slice(6, 8).map((card) => {
            const scaleValue = getCardScaleValue(card.id);
            return (
              <AnimatedPressable
                key={card.id}
                style={[
                  styles.card,
                  { backgroundColor: card.backgroundColor },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: card.textColor }]}
                >
                  {card.title}
                </ThemedText>
                {card.value && (
                  <Text style={[styles.cardValue, { color: card.textColor }]}>
                    {card.value}
                  </Text>
                )}
              </AnimatedPressable>
            );
          })}
        </View>"""

slice_8_10 = slice_6_8.replace("slice(6, 8)", "slice(8, 10)")

content = content.replace(slice_6_8, slice_6_8 + "\n\n" + slice_8_10)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated admin.tsx")
