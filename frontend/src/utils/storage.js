const STORAGE_KEY = import.meta.env.VITE_STORAGE_KEY || 'qd_token'
const SECRET_SALT = import.meta.env.VITE_STORAGE_SALT || 'qd_super_secret_salt_123!'


function encrypt(text) {
  if (!text) return null

  let result = ''
  for (let i = 0; i < text.length; i++) {
    // XOR character code points with the salt
    const charCode = text.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length)
    result += String.fromCharCode(charCode)
  }
  // Convert XORed characters to Base64 to store safely as text
  return btoa(result)
}

function decrypt(encodedText) {
  if (!encodedText) return null

  try {
    // Decode Base64 back to characters
    const text = atob(encodedText)
    let result = ''
    for (let i = 0; i < text.length; i++) {
      // XOR back to original character
      const charCode = text.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length)
      result += String.fromCharCode(charCode)
    }
    return result
  } catch (err) {
    // Return null if token is corrupted or tampered with
    return null
  }
}

export const tokenStorage = {
  getToken: () => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return decrypt(raw)
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, encrypt(token))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  },

  clearToken: () => {
    localStorage.removeItem(STORAGE_KEY)
  }
}
