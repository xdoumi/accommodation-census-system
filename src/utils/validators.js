/**
 * 统一社会信用代码校验（18位字母数字）
 */
export function validateCreditCode(rule, value, callback) {
  if (!value) return callback()
  const regex = /^[0-9A-Z]{18}$/
  if (!regex.test(value)) {
    callback(new Error('请输入18位统一社会信用代码'))
  } else {
    callback()
  }
}

/**
 * 手机号校验
 */
export function validatePhone(rule, value, callback) {
  if (!value) return callback()
  const regex = /^1[3-9]\d{9}$/
  if (!regex.test(value)) {
    callback(new Error('请输入正确的手机号'))
  } else {
    callback()
  }
}

/**
 * 非负整数校验
 */
export function validateNonNegativeInt(rule, value, callback) {
  if (value == null || value === '') return callback()
  if (!Number.isInteger(Number(value)) || Number(value) < 0) {
    callback(new Error('请输入非负整数'))
  } else {
    callback()
  }
}

/**
 * 百分比范围校验 (0-100)
 */
export function validatePercent(rule, value, callback) {
  if (value == null || value === '') return callback()
  if (Number(value) < 0 || Number(value) > 100) {
    callback(new Error('请输入0-100之间的数值'))
  } else {
    callback()
  }
}

/**
 * 用户名格式校验
 */
export function validateUsername(rule, value, callback) {
  if (!value) return callback(new Error('请输入用户名'))
  const regex = /^[a-zA-Z0-9_]{3,20}$/
  if (!regex.test(value)) {
    callback(new Error('用户名须为3-20位字母、数字或下划线'))
  } else {
    callback()
  }
}

/**
 * 密码强度校验
 */
export function validatePassword(rule, value, callback) {
  if (!value) return callback(new Error('请输入密码'))
  if (value.length < 6) {
    callback(new Error('密码长度不少于6位'))
  } else {
    callback()
  }
}
