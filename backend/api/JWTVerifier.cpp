
#include "JWTVerifier.h"

#include <openssl/evp.h>
#include <openssl/core_names.h>
#include <openssl/param_build.h>
#include <openssl/params.h>
#include <openssl/ecdsa.h>
#include <openssl/bn.h>

#include <algorithm>
#include <ctime>
#include <cctype>
#include <memory>
#include <vector>
#include <string>

namespace {

using Json = nlohmann::json;

// --------------------------------------------------
// OpenSSL resource cleanup
// --------------------------------------------------

struct EVPKeyDeleter {
    void operator()(EVP_PKEY* key) const {
        EVP_PKEY_free(key);
    }
};

struct EVPContextDeleter {
    void operator()(EVP_PKEY_CTX* context) const {
        EVP_PKEY_CTX_free(context);
    }
};

struct DigestContextDeleter {
    void operator()(EVP_MD_CTX* context) const {
        EVP_MD_CTX_free(context);
    }
};

struct ParamBuilderDeleter {
    void operator()(OSSL_PARAM_BLD* builder) const {
        OSSL_PARAM_BLD_free(builder);
    }
};

struct ParamsDeleter {
    void operator()(OSSL_PARAM* params) const {
        OSSL_PARAM_free(params);
    }
};

struct BNDeleter {
    void operator()(BIGNUM* number) const {
        BN_free(number);
    }
};

struct ECDSASignatureDeleter {
    void operator()(ECDSA_SIG* signature) const {
        ECDSA_SIG_free(signature);
    }
};

// --------------------------------------------------
// Base64URL decoder
// --------------------------------------------------

bool base64UrlDecode(
    const std::string& input,
    std::string& output
) {
    output.clear();

    if (input.empty() ||
        input.size() > 32768 ||
        input.find('=') != std::string::npos) {
        return false;
    }

    std::string encoded = input;

    for (unsigned char c : encoded) {
        if (!(
            (c >= 'A' && c <= 'Z') ||
            (c >= 'a' && c <= 'z') ||
            (c >= '0' && c <= '9') ||
            c == '-' ||
            c == '_'
        )) {
            return false;
        }
    }

    if (encoded.size() % 4 == 1) {
        return false;
    }

    std::replace(encoded.begin(), encoded.end(), '-', '+');
    std::replace(encoded.begin(), encoded.end(), '_', '/');

    while (encoded.size() % 4 != 0) {
        encoded += '=';
    }

    std::vector<unsigned char> decoded(
        (encoded.size() / 4) * 3
    );

    int decodedLength = EVP_DecodeBlock(
        decoded.data(),
        reinterpret_cast<const unsigned char*>(
            encoded.data()
        ),
        static_cast<int>(encoded.size())
    );

    if (decodedLength < 0) {
        return false;
    }

    if (!encoded.empty() && encoded.back() == '=') {
        --decodedLength;
    }

    if (encoded.size() >= 2 &&
        encoded[encoded.size() - 2] == '=') {
        --decodedLength;
    }

    if (decodedLength < 0) {
        return false;
    }

    output.assign(
        reinterpret_cast<const char*>(decoded.data()),
        static_cast<size_t>(decodedLength)
    );

    return true;
}

// --------------------------------------------------
// JWT segment splitting
// --------------------------------------------------

bool splitJWT(
    const std::string& token,
    std::vector<std::string>& parts
) {
    parts.clear();

    size_t firstDot = token.find('.');

    if (firstDot == std::string::npos) {
        return false;
    }

    size_t secondDot = token.find('.', firstDot + 1);

    if (secondDot == std::string::npos ||
        token.find('.', secondDot + 1) != std::string::npos) {
        return false;
    }

    parts.push_back(token.substr(0, firstDot));

    parts.push_back(
        token.substr(
            firstDot + 1,
            secondDot - firstDot - 1
        )
    );

    parts.push_back(token.substr(secondDot + 1));

    return !parts[0].empty() &&
           !parts[1].empty() &&
           !parts[2].empty();
}

// --------------------------------------------------
// ES256 signature verification
// --------------------------------------------------

bool verifyES256Signature(
    const std::string& signingInput,
    const std::string& rawSignature,
    const std::string& x,
    const std::string& y
) {
    // ES256 uses a 64-byte signature:
    // 32 bytes R + 32 bytes S.

    if (rawSignature.size() != 64) {
        return false;
    }

    std::string xBytes;
    std::string yBytes;

    if (!base64UrlDecode(x, xBytes) ||
        !base64UrlDecode(y, yBytes)) {
        return false;
    }

    if (xBytes.size() != 32 ||
        yBytes.size() != 32) {
        return false;
    }

    // Convert public coordinates into BIGNUM values.

    std::unique_ptr<BIGNUM, BNDeleter> xNumber(
        BN_bin2bn(
            reinterpret_cast<const unsigned char*>(
                xBytes.data()
            ),
            32,
            nullptr
        )
    );

    std::unique_ptr<BIGNUM, BNDeleter> yNumber(
        BN_bin2bn(
            reinterpret_cast<const unsigned char*>(
                yBytes.data()
            ),
            32,
            nullptr
        )
    );

    if (!xNumber || !yNumber) {
        return false;
    }

    // Construct an OpenSSL 3 EC public key.

    std::unique_ptr<OSSL_PARAM_BLD, ParamBuilderDeleter>
        builder(OSSL_PARAM_BLD_new());

    if (!builder) {
        return false;
    }

    if (OSSL_PARAM_BLD_push_utf8_string(
            builder.get(),
            OSSL_PKEY_PARAM_GROUP_NAME,
            "prime256v1",
            0
        ) != 1) {
        return false;
    }

    if (OSSL_PARAM_BLD_push_BN(
            builder.get(),
            OSSL_PKEY_PARAM_EC_PUB_X,
            xNumber.get()
        ) != 1) {
        return false;
    }

    if (OSSL_PARAM_BLD_push_BN(
            builder.get(),
            OSSL_PKEY_PARAM_EC_PUB_Y,
            yNumber.get()
        ) != 1) {
        return false;
    }

    std::unique_ptr<OSSL_PARAM, ParamsDeleter> params(
        OSSL_PARAM_BLD_to_param(builder.get())
    );

    if (!params) {
        return false;
    }

    std::unique_ptr<EVP_PKEY_CTX, EVPContextDeleter>
        importContext(
            EVP_PKEY_CTX_new_from_name(
                nullptr,
                "EC",
                nullptr
            )
        );

    if (!importContext ||
        EVP_PKEY_fromdata_init(importContext.get()) <= 0) {
        return false;
    }

    EVP_PKEY* rawPublicKey = nullptr;

    if (EVP_PKEY_fromdata(
            importContext.get(),
            &rawPublicKey,
            EVP_PKEY_PUBLIC_KEY,
            params.get()
        ) <= 0) {
        return false;
    }

    std::unique_ptr<EVP_PKEY, EVPKeyDeleter>
        publicKey(rawPublicKey);

    // Validate the imported public key.

    std::unique_ptr<EVP_PKEY_CTX, EVPContextDeleter>
        checkContext(
            EVP_PKEY_CTX_new(
                publicKey.get(),
                nullptr
            )
        );

    if (!checkContext ||
        EVP_PKEY_public_check(checkContext.get()) != 1) {
        return false;
    }

    // Convert JWT's raw R||S signature into DER format.

    std::unique_ptr<ECDSA_SIG, ECDSASignatureDeleter>
        signature(ECDSA_SIG_new());

    if (!signature) {
        return false;
    }

    BIGNUM* r = BN_bin2bn(
        reinterpret_cast<const unsigned char*>(
            rawSignature.data()
        ),
        32,
        nullptr
    );

    BIGNUM* s = BN_bin2bn(
        reinterpret_cast<const unsigned char*>(
            rawSignature.data() + 32
        ),
        32,
        nullptr
    );

    if (!r || !s) {
        BN_free(r);
        BN_free(s);
        return false;
    }

    if (ECDSA_SIG_set0(
            signature.get(),
            r,
            s
        ) != 1) {
        BN_free(r);
        BN_free(s);
        return false;
    }

    int derLength = i2d_ECDSA_SIG(
        signature.get(),
        nullptr
    );

    if (derLength <= 0) {
        return false;
    }

    std::vector<unsigned char> derSignature(
        static_cast<size_t>(derLength)
    );

    unsigned char* derPointer = derSignature.data();

    if (i2d_ECDSA_SIG(
            signature.get(),
            &derPointer
        ) != derLength) {
        return false;
    }

    // Verify SHA-256 ECDSA signature.

    EVP_MD_CTX* rawDigestContext = EVP_MD_CTX_new();

    if (!rawDigestContext) {
        return false;
    }

    std::unique_ptr<
        EVP_MD_CTX,
        DigestContextDeleter
    > digestContext(rawDigestContext);

    if (EVP_DigestVerifyInit(
            digestContext.get(),
            nullptr,
            EVP_sha256(),
            nullptr,
            publicKey.get()
        ) != 1) {
        return false;
    }

    return EVP_DigestVerify(
        digestContext.get(),
        derSignature.data(),
        derSignature.size(),
        reinterpret_cast<const unsigned char*>(
            signingInput.data()
        ),
        signingInput.size()
    ) == 1;
}

// --------------------------------------------------
// JWKS key validation
// --------------------------------------------------

bool isValidSigningKey(const Json& key) {
    if (!key.is_object()) {
        return false;
    }

    if (key.value("kty", std::string()) != "EC" ||
        key.value("crv", std::string()) != "P-256") {
        return false;
    }

    if (key.contains("alg") &&
        key["alg"] != "ES256") {
        return false;
    }

    if (key.contains("use") &&
        key["use"] != "sig") {
        return false;
    }

    if (key.contains("key_ops")) {
        if (!key["key_ops"].is_array()) {
            return false;
        }

        bool canVerify = false;

        for (const auto& operation : key["key_ops"]) {
            if (operation.is_string() &&
                operation == "verify") {
                canVerify = true;
            }
        }

        if (!canVerify) {
            return false;
        }
    }

    return key.contains("x") &&
           key.contains("y") &&
           key["x"].is_string() &&
           key["y"].is_string();
}

}

// ==================================================
// JWTVerifier implementation
// ==================================================

JWTVerifier::JWTVerifier(
    SupabaseClient& client,
    const std::string& projectUrl
)
    : client(client),
      projectUrl(projectUrl) {

    while (!this->projectUrl.empty() &&
           this->projectUrl.back() == '/') {
        this->projectUrl.pop_back();
    }
}

// --------------------------------------------------
// Validate JWT claims
// --------------------------------------------------

bool JWTVerifier::validateClaims(
    const nlohmann::json& claims,
    std::string& error
) {
    try {
        if (!claims.is_object()) {
            error = "Invalid JWT claims.";
            return false;
        }

        // Validate issuer.

        if (!claims.contains("iss") ||
            !claims["iss"].is_string() ||
            claims["iss"].get<std::string>() !=
                projectUrl + "/auth/v1") {

            error = "Invalid token issuer.";
            return false;
        }

        // Validate audience.

        if (!claims.contains("aud")) {
            error = "Missing audience claim.";
            return false;
        }

        bool validAudience = false;

        if (claims["aud"].is_string()) {
            validAudience =
                claims["aud"].get<std::string>() ==
                "authenticated";
        }
        else if (claims["aud"].is_array()) {
            for (const auto& audience : claims["aud"]) {
                if (audience.is_string() &&
                    audience == "authenticated") {
                    validAudience = true;
                    break;
                }
            }
        }

        if (!validAudience) {
            error = "Invalid token audience.";
            return false;
        }

        // Validate subject.

        if (!claims.contains("sub") ||
            !claims["sub"].is_string() ||
            claims["sub"].get<std::string>().empty()) {

            error = "Missing subject claim.";
            return false;
        }

        // Validate role.

        if (!claims.contains("role") ||
            !claims["role"].is_string() ||
            claims["role"].get<std::string>() !=
                "authenticated") {

            error = "Invalid token role.";
            return false;
        }

        // Validate expiration.

        if (!claims.contains("exp") ||
            !claims["exp"].is_number_integer()) {

            error = "Missing or invalid expiration.";
            return false;
        }

        const long long now =
            static_cast<long long>(std::time(nullptr));

        const long long expiry =
            claims["exp"].get<long long>();

        if (expiry <= now) {
            error = "Token has expired.";
            return false;
        }

        // Validate issued-at time.

        if (!claims.contains("iat") ||
            !claims["iat"].is_number_integer()) {

            error = "Missing or invalid issued-at claim.";
            return false;
        }

        const long long issuedAt =
            claims["iat"].get<long long>();

        constexpr long long CLOCK_SKEW = 60;

        if (issuedAt > now + CLOCK_SKEW ||
            issuedAt >= expiry) {

            error = "Invalid token issued-at time.";
            return false;
        }

        // Validate not-before if supplied.

        if (claims.contains("nbf")) {
            if (!claims["nbf"].is_number_integer()) {
                error = "Invalid not-before claim.";
                return false;
            }

            if (claims["nbf"].get<long long>() >
                now + CLOCK_SKEW) {

                error = "Token is not active yet.";
                return false;
            }
        }

        return true;
    }
    catch (const std::exception&) {
        error = "JWT claim validation failed.";
        return false;
    }
}

// --------------------------------------------------
// Verify JWT
// --------------------------------------------------

JWTVerifier::VerificationResult JWTVerifier::verify(
    const std::string& accessToken
) {
    VerificationResult result;

    if (accessToken.empty() ||
        accessToken.size() > 16384) {

        result.error = "Invalid token size.";
        return result;
    }

    std::vector<std::string> parts;

    if (!splitJWT(accessToken, parts)) {
        result.error = "Malformed JWT.";
        return result;
    }

    try {
        // Decode JWT header.

        std::string decodedHeader;

        if (!base64UrlDecode(parts[0], decodedHeader)) {
            result.error = "Invalid JWT header encoding.";
            return result;
        }

        Json header = Json::parse(decodedHeader);

        if (!header.is_object()) {
            result.error = "Invalid JWT header.";
            return result;
        }

        // Accept only ES256.

        if (!header.contains("alg") ||
            !header["alg"].is_string() ||
            header["alg"].get<std::string>() != "ES256") {

            result.error = "Unsupported JWT algorithm.";
            return result;
        }

        // Reject critical extensions we do not implement.

        if (header.contains("crit") ||
            (header.contains("b64") &&
             header["b64"] != true)) {

            result.error = "Unsupported JWT header extension.";
            return result;
        }

        if (header.contains("typ") &&
            (!header["typ"].is_string() ||
             header["typ"].get<std::string>() != "JWT")) {

            result.error = "Invalid JWT type.";
            return result;
        }

        // Get key identifier.

        if (!header.contains("kid") ||
            !header["kid"].is_string()) {

            result.error = "Missing JWT key identifier.";
            return result;
        }

        std::string keyId =
            header["kid"].get<std::string>();

        if (keyId.empty() || keyId.size() > 256) {
            result.error = "Invalid JWT key identifier.";
            return result;
        }

        // Retrieve Supabase public JWKS document.

        auto jwksResponse = client.request(
            "GET",
            "/auth/v1/.well-known/jwks.json"
        );

        if (!jwksResponse.isSuccess()) {
            result.error =
                "Unable to retrieve Supabase public keys.";
            return result;
        }

        if (jwksResponse.body.size() > 65536) {
            result.error = "JWKS response is too large.";
            return result;
        }

        Json jwks = Json::parse(jwksResponse.body);

        if (!jwks.is_object() ||
            !jwks.contains("keys") ||
            !jwks["keys"].is_array() ||
            jwks["keys"].size() > 32) {

            result.error = "Invalid JWKS response.";
            return result;
        }

        // Locate matching key by kid.

        const Json* matchingKey = nullptr;

        for (const auto& key : jwks["keys"]) {
            if (!key.is_object() ||
                !key.contains("kid") ||
                !key["kid"].is_string()) {
                continue;
            }

            if (key["kid"].get<std::string>() == keyId) {
                if (matchingKey != nullptr) {
                    result.error =
                        "Duplicate signing key identifier.";
                    return result;
                }

                matchingKey = &key;
            }
        }

        if (!matchingKey) {
            result.error = "Signing key not found.";
            return result;
        }

        const Json& key = *matchingKey;

        if (!isValidSigningKey(key)) {
            result.error = "Invalid ES256 signing key.";
            return result;
        }

        // Decode signature.

        std::string rawSignature;

        if (!base64UrlDecode(parts[2], rawSignature)) {
            result.error = "Invalid JWT signature encoding.";
            return result;
        }

        // Verify signature over original encoded segments.

        const std::string signingInput =
            parts[0] + "." + parts[1];

        if (!verifyES256Signature(
                signingInput,
                rawSignature,
                key["x"].get<std::string>(),
                key["y"].get<std::string>()
            )) {

            result.error =
                "JWT signature verification failed.";
            return result;
        }

        // Only decode claims after signature verification.

        std::string decodedClaims;

        if (!base64UrlDecode(parts[1], decodedClaims)) {
            result.error = "Invalid JWT claims encoding.";
            return result;
        }

        Json claims = Json::parse(decodedClaims);

        // Validate trusted claims.

        if (!validateClaims(claims, result.error)) {
            return result;
        }

        result.userId =
            claims["sub"].get<std::string>();

        result.claims = claims;
        result.valid = true;

        return result;
    }
    catch (const std::exception&) {
        result.valid = false;
        result.userId.clear();
        result.claims = nullptr;
        result.error = "JWT verification failed.";
        return result;
    }
}
