package vn.haui.advisor.platform.seed;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetEncoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;

/**
 * Sửa chuỗi UTF-8 bị đọc nhầm thành Windows-1252 rồi ghi lại (mojibake, vd. "LÃª Viá»‡t HÃ¹ng").
 * Chỉ sửa khi mọi ký tự mã hóa được về 1 byte và chuỗi byte là UTF-8 hợp lệ, nên chữ Việt đúng (vd. "ệ")
 * không bao giờ bị đụng tới.
 */
final class FixtureText {

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");

    private FixtureText() {
    }

    static String repair(String value) {
        if (value == null || value.chars().allMatch(c -> c < 0x80)) {
            return value;
        }
        CharsetEncoder encoder = WINDOWS_1252.newEncoder();
        byte[] bytes = new byte[value.length()];
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c < 0x100) {
                bytes[i] = (byte) c;
            } else if (encoder.canEncode(c)) {
                bytes[i] = WINDOWS_1252.encode(CharBuffer.wrap(new char[]{c})).get();
            } else {
                return value;
            }
        }
        try {
            String decoded = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
            return decoded.equals(value) ? value : decoded;
        } catch (CharacterCodingException ex) {
            return value;
        }
    }
}
