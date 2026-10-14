import { doc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { deleteObject, ref, uploadBytes } from 'firebase/storage'
import { db, functions, storage } from '../firebase'
import {
  EMPLOYEE_ROLES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  MAX_OFFER_BYTES,
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
} from './constants'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const PHONE = /^\+?[0-9][0-9 ()-]{6,18}$/

function callFunction(name, payload) {
  return httpsCallable(functions, name)(payload).then((result) => result.data)
}

export function validateContactDetails({ phone, address }) {
  if (!PHONE.test(phone.trim())) {
    return 'Enter a valid phone number using digits, spaces, +, - or parentheses.'
  }
  if (address.trim().length > 300) return 'Address must be 300 characters or fewer.'
  return ''
}

export function validateEmployment(values, { canEditRole }) {
  const requiredText = ['fullName', 'employeeId', 'department', 'designation', 'workLocation']
  if (requiredText.some((field) => !values[field].trim())) {
    return 'Name, employee ID, department, designation and work location are required.'
  }
  if (values.birthday && !DATE_KEY.test(values.birthday)) return 'Birthday must be a valid date.'
  if (!DATE_KEY.test(values.dateOfJoining)) return 'Date of joining must be a valid date.'
  if (!EMPLOYMENT_STATUSES.includes(values.employmentStatus)) return 'Choose a valid employment status.'
  if (!EMPLOYMENT_TYPES.includes(values.employmentType)) return 'Choose a valid employment type.'
  if (canEditRole && !EMPLOYEE_ROLES.includes(values.role)) return 'Choose a valid role.'
  return ''
}

export function saveContactDetails(uid, { phone, address }) {
  return updateDoc(doc(db, 'users', uid), { phone: phone.trim(), address: address.trim() })
}

export function saveEmploymentDetails(uid, values, { canEditRole }) {
  const payload = {
    fullName: values.fullName.trim(),
    employeeId: values.employeeId.trim(),
    birthday: values.birthday || null,
    dateOfJoining: values.dateOfJoining,
    department: values.department.trim(),
    designation: values.designation.trim(),
    reportingManager: values.reportingManager.trim(),
    workLocation: values.workLocation.trim(),
    employmentType: values.employmentType,
    employmentStatus: values.employmentStatus,
  }
  if (canEditRole) payload.role = values.role
  return updateDoc(doc(db, 'users', uid), payload)
}

export async function uploadProfilePhoto(uid, file, previousPath) {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.')
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Photo must be 2 MB or smaller.')

  const path = `profile-photos/${uid}/${Date.now()}`
  await uploadBytes(ref(storage, path), file, { contentType: file.type })
  await updateDoc(doc(db, 'users', uid), { photoPath: path })
  if (previousPath) await deleteObject(ref(storage, previousPath)).catch(() => {})
}

export function punchIn(workLocation = 'OFFICE') {
  return callFunction('punchIn', { workLocation })
}

export function punchOut() {
  return callFunction('punchOut')
}

export function correctAttendance(payload) {
  return callFunction('correctAttendance', payload)
}

export function createStaff(values) {
  return callFunction('createStaff', values)
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(file)
  })
}

export async function uploadOfferLetter({ file, employeeUid, templateKey, designation, joiningDate }) {
  if (file.type !== 'application/pdf') throw new Error('Choose a PDF file.')
  if (file.size > MAX_OFFER_BYTES) throw new Error('PDF must be 3 MB or smaller.')

  return callFunction('uploadOfferLetter', {
    employeeUid,
    templateKey,
    designation: designation.trim(),
    joiningDate,
    fileName: file.name,
    contentBase64: await readFileAsBase64(file),
  })
}

export function approveOfferLetter(documentId) {
  return callFunction('approveOfferLetter', { documentId })
}

export async function fetchOfferLetter(documentId) {
  const { fileName, contentBase64 } = await callFunction('getOfferLetter', { documentId })
  const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0))
  return { fileName, blob: new Blob([bytes], { type: 'application/pdf' }) }
}
