const UNKNOWN = "unknown";

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeSerialNumber(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidSerialNumber(serialNumber) {
  return serialNumber.length > 0 && serialNumber.length <= 128 && !/[\u0000-\u001f]/.test(serialNumber);
}

function normalizeText(value) {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return normalized || UNKNOWN;
}

function normalizeDeviceType(value) {
  const type = normalizeText(value).toLowerCase();

  if (type.includes("phone") || type.includes("mobile")) {
    return "phone";
  }
  if (type.includes("laptop") || type.includes("notebook") || type.includes("macbook")) {
    return "laptop";
  }
  if (type.includes("desktop") || type === "pc" || type.includes("workstation")) {
    return "pc";
  }
  if (
    type.includes("network") ||
    type.includes("router") ||
    type.includes("switch") ||
    type.includes("firewall") ||
    type.includes("access point")
  ) {
    return "network device";
  }
  if (type.includes("tablet") || type.includes("ipad")) {
    return "tablet";
  }
  if (type.includes("printer") || type.includes("scanner")) {
    return "printer";
  }
  if (type === UNKNOWN) {
    return UNKNOWN;
  }

  return type;
}

function normalizeStatus(value) {
  const status = normalizeText(value).toLowerCase();

  if (["active", "available", "assigned", "in use", "online"].includes(status)) {
    return "active";
  }
  if (["inactive", "maintenance", "retired", "disposed", "disabled", "lost", "offline"].includes(status)) {
    return "inactive";
  }

  return UNKNOWN;
}

function normalizeDate(value) {
  const rawDate = firstString(value);
  if (!rawDate) {
    return "";
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function normalizeWarrantyStatus(value, expiryDate) {
  const status = normalizeText(value).toLowerCase();

  if (["active", "valid", "covered", "in warranty"].includes(status)) {
    return "active";
  }
  if (["expired", "inactive", "not covered", "out of warranty"].includes(status)) {
    return "expired";
  }
  if (expiryDate) {
    return new Date(`${expiryDate}T23:59:59.999Z`) >= new Date() ? "active" : "expired";
  }

  return UNKNOWN;
}

function normalizeWarranty(source) {
  const warrantySource = source.warranty && typeof source.warranty === "object" ? source.warranty : {};
  const expiryDate = normalizeDate(firstString(
    warrantySource.expiry_date,
    warrantySource.expiryDate,
    warrantySource.expiry,
    source.warranty_expiry_date,
    source.warrantyExpiryDate,
    source.warranty_expiry,
  ));
  const statusValue = firstString(
    warrantySource.status,
    source.warranty_status,
    source.warrantyStatus,
  );

  if (!statusValue && !expiryDate) {
    return null;
  }

  const warranty = {
    status: normalizeWarrantyStatus(statusValue, expiryDate),
  };

  if (expiryDate) {
    warranty.expiry_date = expiryDate;
  }

  return warranty;
}

export function createUnknownDeviceInfo(serialNumber, code, message) {
  return {
    serial_number: normalizeSerialNumber(serialNumber),
    device_type: UNKNOWN,
    manufacturer: UNKNOWN,
    model: UNKNOWN,
    status: UNKNOWN,
    warranty: null,
    error: {
      code,
      message,
    },
  };
}

function formatDeviceInfo(source, fallbackSerialNumber) {
  // Step 1: Choose the best serial number from the scanned input and returned data.
  const serialNumber = normalizeSerialNumber(firstString(
    source.serial_number,
    source.serialNumber,
    source.serial,
    fallbackSerialNumber,
  ));

  // Step 2: Normalize the source category/type into one consistent device_type value.
  const deviceType = normalizeDeviceType(firstString(
    source.device_type,
    source.deviceType,
    source.type,
    source.category,
  ));

  // Step 3: Normalize maker details while preserving meaningful manufacturer/model casing.
  const manufacturer = normalizeText(firstString(
    source.manufacturer,
    source.brand,
    source.vendor,
    source.maker,
  ));
  const model = normalizeText(firstString(
    source.model,
    source.model_name,
    source.modelName,
    source.product_name,
    source.productName,
  ));

  // Step 4: Normalize inventory/provider status into active, inactive, or unknown.
  const status = normalizeStatus(source.status);

  // Step 5: Include warranty only when a status or expiry date is available.
  const warranty = normalizeWarranty(source);

  // Step 6: Return the single JSON object consumed by the scanner.
  return {
    serial_number: serialNumber || UNKNOWN,
    device_type: deviceType,
    manufacturer,
    model,
    status,
    warranty,
  };
}

async function fetchProviderDeviceInfo(serialNumber, providerConfig) {
  if (!providerConfig?.providerUrl || !providerConfig?.apiKey) {
    return null;
  }

  // Step 1: Build the provider URL from environment configuration.
  const baseUrl = providerConfig.providerUrl.replace(/\/$/, "");
  const url = `${baseUrl}/devices/${encodeURIComponent(serialNumber)}`;

  // Step 2: Send the placeholder API token from DEVICE_INFO_API_KEY.
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${providerConfig.apiKey}`,
      Accept: "application/json",
    },
  });

  // Step 3: Treat not-found responses as a graceful miss so local output remains consistent.
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Device info provider returned ${response.status}`);
  }

  // Step 4: Parse the provider payload so it can be normalized into the scanner contract.
  return response.json();
}

export class DeviceInfoService {
  constructor({ deviceRepository, providerConfig }) {
    this.deviceRepository = deviceRepository;
    this.providerConfig = providerConfig;
  }

  async lookupBySerialNumber(rawSerialNumber) {
    // Step 1: Normalize and validate the serial collected by the scanner.
    const serialNumber = normalizeSerialNumber(rawSerialNumber);
    if (!isValidSerialNumber(serialNumber)) {
      return {
        status: 400,
        body: createUnknownDeviceInfo(
          serialNumber,
          "INVALID_SERIAL_NUMBER",
          "Enter a valid device serial number.",
        ),
      };
    }

    // Step 2: Retrieve a matching device from the local CouchDB inventory.
    const localDevice = await this.deviceRepository.findBySerialNumberOrAssetTag(serialNumber);
    if (localDevice) {
      return {
        status: 200,
        body: formatDeviceInfo(localDevice, serialNumber),
      };
    }

    try {
      // Step 3: Optionally retrieve additional details from a configured provider.
      const providerDevice = await fetchProviderDeviceInfo(serialNumber, this.providerConfig);
      if (providerDevice) {
        return {
          status: 200,
          body: formatDeviceInfo(providerDevice, serialNumber),
        };
      }
    } catch {
      // Step 4: Keep provider failures graceful and return a normalized unknown result.
      return {
        status: 503,
        body: createUnknownDeviceInfo(
          serialNumber,
          "DEVICE_INFO_PROVIDER_UNAVAILABLE",
          "Device information could not be retrieved right now.",
        ),
      };
    }

    // Step 5: Return a consistent unknown result when no source recognizes the serial.
    return {
      status: 404,
      body: createUnknownDeviceInfo(
        serialNumber,
        "DEVICE_NOT_FOUND",
        "No device information found for this serial number.",
      ),
    };
  }
}
