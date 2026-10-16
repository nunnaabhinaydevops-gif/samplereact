import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

function callFunction(name, payload) {
  return httpsCallable(functions, name)(payload).then((result) => result.data)
}

export function submitBankDetails(values) {
  return callFunction('submitBankDetails', values)
}

export function saveTaxDeclaration(values) {
  return callFunction('saveTaxDeclaration', values)
}

export function requestLoan(values) {
  return callFunction('requestLoan', values)
}

export async function fetchPayslip(recordId) {
  const { fileName, contentBase64 } = await callFunction('getPayslip', { recordId })
  const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0))
  return { fileName, blob: new Blob([bytes], { type: 'application/pdf' }) }
}
