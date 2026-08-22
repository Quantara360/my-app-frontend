import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { API_BASE_URL } from '@/services/authService';

// Base dimensions of the PSD template
const BASE_W = 975;
const BASE_H = 643;

const RAW_PHOTO_X = 53;
const RAW_PHOTO_Y = 156;
const RAW_PHOTO_W = 240;
const RAW_PHOTO_H = 348;

const RAW_DATE_X = 52;
const RAW_DATE_Y = 535;

const RAW_LABEL_X = 340;
const RAW_COLON_X = 550;
const RAW_INFO_X = 580;

const RAW_ROW1_Y = 210;
const RAW_ROW2_Y = 287;
const RAW_ROW3_Y = 363;

const RAW_HEADER_SITE_X = 245;
const RAW_HEADER_SITE_Y = 24;

const isMobileBrowser =
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

// Minimal shape the card needs — deliberately looser than the full Worker
// record so callers (e.g. an attendance row, which only has the worker
// relation nested inside it) can pass what they already have.
export type IdCardWorker = {
  id: number;
  name: string;
  role?: string | null;
  nic?: string | null;
  join_date?: string | null;
  face_photo_path?: string | null;
  worksite?: { name: string } | null;
};

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function getPhotoUrl(worker: IdCardWorker): string | null {
  if (!worker.face_photo_path) return null;
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${apiOrigin}/storage/${worker.face_photo_path}`;
}

function cardHtml(worker: IdCardWorker, templateUri: string): string {
  const photoUrl = getPhotoUrl(worker);
  const dateStr = formatDate(worker.join_date);
  return `<!DOCTYPE html>
<html>
<head>
  <title>ID Card – ${worker.name}</title>
  <style>
    @page { size: 975px 643px; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 975px; height: 643px; overflow: hidden; }
    .card { position: relative; width: 975px; height: 643px; }
    .bg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .photo { position: absolute; left: 53px; top: 156px; width: 240px; height: 348px; object-fit: cover; border: 2px solid #111; }
    .photo-placeholder { position: absolute; left: 53px; top: 156px; width: 240px; height: 348px; background: #ccc; display: flex; align-items: center; justify-content: center; font-size: 60px; }
    .date { position: absolute; left: 52px; top: 535px; font-size: 20px; font-weight: 700; color: #111; font-family: Arial, sans-serif; }
    .label { font-size: 26px; font-weight: 700; color: #111; font-family: 'Arial Black', Arial, sans-serif; position: absolute; left: 340px; }
    .colon { font-size: 26px; font-weight: 700; color: #111; font-family: 'Arial Black', Arial, sans-serif; position: absolute; left: 550px; }
    .val { font-size: 26px; font-weight: 700; color: #111; font-family: Arial, sans-serif; position: absolute; left: 580px; }
    .header-site { position: absolute; left: 245px; top: 24px; right: 20px; font-size: 50px; font-weight: 900; font-family: 'Arial Black', Arial, sans-serif; text-transform: uppercase; white-space: nowrap; overflow: hidden; }
    .row1 { top: 210px; } .row2 { top: 287px; } .row3 { top: 363px; }
    @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="card">
    <img class="bg" src="${templateUri}" />
    ${photoUrl ? `<img class="photo" src="${photoUrl}" />` : `<div class="photo-placeholder">👤</div>`}
    <div class="header-site">
      <span style="color: #fff;">${worker.worksite?.name || "AMIL"} </span>
      <span style="color: #FFD700;">JANITOR SERVICES</span>
    </div>
    <div class="date">Date: ${dateStr}</div>
    <div class="label row1">NAME</div><div class="colon row1">:</div><div class="val row1">${worker.name}</div>
    <div class="label row2">DESIGNATION</div><div class="colon row2">:</div><div class="val row2">${worker.role || "—"}</div>
    <div class="label row3">NIC NO.</div><div class="colon row3">:</div><div class="val row3">${worker.nic || "—"}</div>
  </div>
  <script>
    Promise.all(Array.from(document.images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    })).then(() => {
      setTimeout(() => { window.print(); window.close(); }, 300);
    });
  <\/script>
</body>
</html>`;
}

export function printCard(worker: IdCardWorker) {
  if (Platform.OS !== "web") return;
  const templateAsset = Asset.fromModule(require("../../assets/images/id_card_template_clean.png"));
  const html = cardHtml(worker, templateAsset.uri);
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export async function downloadPdfCard(worker: IdCardWorker) {
  const templateAsset = Asset.fromModule(require("../../assets/images/id_card_template_clean.png"));
  await templateAsset.downloadAsync();
  const templateUri = templateAsset.localUri || templateAsset.uri;
  const html = cardHtml(worker, templateUri);

  if (Platform.OS === 'web') {
    // On web mobile: open in new tab — browser's share sheet lets user save as PDF
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
    return;
  }

  // Native mobile: use expo-print + expo-sharing
  let templateBase64 = '';
  try {
    const FileSystemModule = await import('expo-file-system');
    templateBase64 = await FileSystemModule.readAsStringAsync(templateUri, { encoding: 'base64' as any });
  } catch (e) {
    console.warn('Could not read template as base64', e);
  }
  const templateSrc = templateBase64 ? `data:image/png;base64,${templateBase64}` : templateUri;
  const nativeHtml = html.replace(templateUri, templateSrc);
  const { uri } = await Print.printToFileAsync({ html: nativeHtml, width: 975, height: 643 });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `ID Card – ${worker.name}`, UTI: 'com.adobe.pdf' });
}

type Props = {
  visible: boolean;
  worker: IdCardWorker | null;
  onClose: () => void;
};

/**
 * The worker ID card, shown inline as a modal wherever it's needed (the
 * Templates page, the attendance table's "ID Card" action, etc.) instead of
 * navigating away to a dedicated page.
 */
export function WorkerIdCardModal({ visible, worker, onClose }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width: screenWidth } = useWindowDimensions();
  const CARD_W = Math.min(650, screenWidth - 40);
  const CARD_H = Math.round(BASE_H * (CARD_W / BASE_W));
  const SCALE = CARD_W / BASE_W;

  const PHOTO_X = Math.round(RAW_PHOTO_X * SCALE);
  const PHOTO_Y = Math.round(RAW_PHOTO_Y * SCALE);
  const PHOTO_W = Math.round(RAW_PHOTO_W * SCALE);
  const PHOTO_H = Math.round(RAW_PHOTO_H * SCALE);
  const DATE_X = Math.round(RAW_DATE_X * SCALE);
  const DATE_Y = Math.round(RAW_DATE_Y * SCALE);
  const LABEL_X = Math.round(RAW_LABEL_X * SCALE);
  const COLON_X = Math.round(RAW_COLON_X * SCALE);
  const INFO_X = Math.round(RAW_INFO_X * SCALE);
  const ROW1_Y = Math.round(RAW_ROW1_Y * SCALE);
  const ROW2_Y = Math.round(RAW_ROW2_Y * SCALE);
  const ROW3_Y = Math.round(RAW_ROW3_Y * SCALE);
  const HEADER_SITE_X = Math.round(RAW_HEADER_SITE_X * SCALE);
  const HEADER_SITE_Y = Math.round(RAW_HEADER_SITE_Y * SCALE);

  if (!worker) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
          <View style={styles.modalBar}>
            <ThemedText type="subtitle" style={{ fontSize: 15, fontWeight: "700" }}>
              ID Card – {worker.name}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {Platform.OS === "web" && !isMobileBrowser ? (
                <Pressable onPress={() => { onClose(); printCard(worker); }} style={styles.printBtn}>
                  <Text style={styles.printBtnTxt}>🖨 Print</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => { onClose(); downloadPdfCard(worker); }} style={styles.printBtn}>
                  <Text style={styles.printBtnTxt}>⬇ Download PDF</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? "#444" : "#e5e5ea" }]}>
                <Text style={[styles.closeBtnTxt, { color: isDark ? "#fff" : "#333" }]}>✕ Close</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ width: CARD_W, height: CARD_H, position: "relative" }}>
            <Image
              source={require("../../assets/images/id_card_template_clean.png")}
              style={{ position: "absolute", width: CARD_W, height: CARD_H }}
              resizeMode="stretch"
            />

            {getPhotoUrl(worker) ? (
              <Image
                source={{ uri: getPhotoUrl(worker)! }}
                style={{ position: "absolute", left: PHOTO_X, top: PHOTO_Y, width: PHOTO_W, height: PHOTO_H, borderWidth: 2, borderColor: "#111" }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  position: "absolute", left: PHOTO_X, top: PHOTO_Y, width: PHOTO_W, height: PHOTO_H,
                  backgroundColor: "rgba(200,200,200,0.5)", alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 36 }}>👤</Text>
              </View>
            )}

            <Text style={{ position: "absolute", left: DATE_X, top: DATE_Y, fontSize: Math.round(20 * SCALE), fontWeight: "700", color: "#111" }}>
              Date: {formatDate(worker.join_date)}
            </Text>

            <Text
              style={{ position: "absolute", left: HEADER_SITE_X, top: HEADER_SITE_Y, width: CARD_W - HEADER_SITE_X - Math.round(20 * SCALE) }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              <Text style={{ fontSize: Math.round(50 * SCALE), fontWeight: "900", color: "#fff", textTransform: "uppercase" }}>
                {worker.worksite?.name || "AMIL"}{" "}
              </Text>
              <Text style={{ fontSize: Math.round(50 * SCALE), fontWeight: "900", color: "#FFD700", textTransform: "uppercase" }}>
                JANITOR SERVICES
              </Text>
            </Text>

            {[
              { y: ROW1_Y, label: "NAME", value: worker.name },
              { y: ROW2_Y, label: "DESIGNATION", value: worker.role || "—" },
              { y: ROW3_Y, label: "NIC NO.", value: worker.nic || "—" },
            ].map((row, idx) => (
              <View key={idx}>
                <Text style={{ position: "absolute", left: LABEL_X, top: row.y, fontSize: Math.round(26 * SCALE), fontWeight: "900", color: "#111" }}>
                  {row.label}
                </Text>
                <Text style={{ position: "absolute", left: COLON_X, top: row.y, fontSize: Math.round(26 * SCALE), fontWeight: "900", color: "#111" }}>
                  :
                </Text>
                <Text style={{ position: "absolute", left: INFO_X, top: row.y, fontSize: Math.round(26 * SCALE), fontWeight: "700", color: "#111" }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center", alignItems: "center", padding: 12,
  },
  modalBox: {
    borderRadius: 16, padding: 16,
  },
  modalBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  printBtn: { backgroundColor: "#1a7a3a", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  printBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  closeBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  closeBtnTxt: { fontSize: 13, fontWeight: "600" },
});
