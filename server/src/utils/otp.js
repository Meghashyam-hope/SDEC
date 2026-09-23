const OTP_TTL_MINUTES = 5;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpExpiry() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

function maskPhone(phone) {
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
}

module.exports = { generateOtp, otpExpiry, maskPhone, OTP_TTL_MINUTES };
