export const enum AdvFlag
{
    /// FlagS
    FLAGS                           = 0x01,
    /// Incomplete List of 16-bit Service Class UUIDs
    UUID_16_BIT,
    /// Complete List of 16-bit Service Class UUIDs
    LIST_16_BIT_UUID,
    /// Incomplete List of 32-bit Service Class UUIDs
    UUID_32_BIT,
    /// Complete List of 32-bit Service Class UUIDs
    LIST_32_BIT_UUID,
    /// Incomplete List of 128-bit Service Class UUIDs
    UUID_128_BIT,
    /// Complete List of 128-bit Service Class UUIDs
    LIST_128_BIT_UUID,
    /// Shortened Local Name
    SHORTENED_NAME,
    /// Complete Local Name
    COMPLETE_NAME,
    /// Tx Power Level
    TRANSMIT_POWER,

    /// Class of device
    CLASS_OF_DEVICE                 = 0x0D,
    /// Simple Pairing Hash C
    PAIRING_HASH_C,
    /// Simple Pairing Randomizer
    PAIRING_RANDOMIZER_R,

// -------- 0x10
    /// Device ID / Temporary key value
    DEVICE_ID                       = 0x10,
    /// Out of Band Flag
    OOB_FLAGS,
    /// Slave connection interval range
    SLAVE_CONN_INTV_RANGE,
    /// Signed data
    SIGNED_DATA,       // ??
    /// List of 128-bit Service Solicitation UUIDs
    RQRD_16_BIT_SVC_UUID            = 0x14,
    /// List of 128-bit Service Solicitation UUIDs
    RQRD_128_BIT_SVC_UUID,
    /// Service data
    SVC_DATA_16_BIT_UUID,
    /// Public Target Address
    PUBLIC_ADDR,
    /// Public Random Address
    RANDOM_ADDR,
    /// Appearance
    APPERANCE,

    /// Advertising Interval
    ADV_INTV                        = 0x1A,
    /// LE Bluetooth Device Address
    LE_DEVICE_ADDR,
    /// LE Role
    LE_ROLE,
    /// Simple Pairing Hash C-256
    PAIRING_HASH_C256,
    /// Simple Pairing Randomizer R-256
    PAIRING_RANDOMIZER_R256,

    /// List of 32-bit Service Solicitation UUIDs
    RQRD_32_BIT_SVC_UUID,

// -------- 0x20
    /// Service data
    SVC_DATA_32_BIT_UUID            = 0x20,
    /// Service data
    SVC_DATA_128_BIT_UUID,
/*
0x22 	«LE Secure Connections Confirmation Value» 	Core Specification Supplement Part A, Section 1.6
0x23 	«LE Secure Connections Random Value» 	Core Specification Supplement Part A, Section 1.6
0x24 	«URI» 	Bluetooth Core Specification:Core Specification Supplement, Part A, section 1.18
0x25 	«Indoor Positioning» 	Indoor Positioning Service v1.0 or later
0x26 	«Transport Discovery Data» 	Transport Discovery Service v1.0 or later
0x27 	«LE Supported Features» 	Core Specification Supplement, Part A, Section 1.19
0x28 	«Channel Map Update Indication» 	Core Specification Supplement, Part A, Section 1.20
0x29 	«PB-ADV» 	Mesh Profile Specification Section 5.2.1
0x2A 	«Mesh Message» 	Mesh Profile Specification Section 3.3.1
0x2B 	«Mesh Beacon» 	Mesh Profile Specification Section 3.9
0x2C 	«BIGInfo»
0x2D 	«Broadcast_Code»
0x3D 	«3D Information Data» 	3D Synchronization Profile, v1.0 or later
*/

// --------
    /// Manufacturer specific data
    MANU_SPECIFIC_DATA              = 0xFF,
}
