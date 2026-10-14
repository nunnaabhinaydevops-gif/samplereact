import AttendanceActions from '../me/AttendanceActions'
import AttendanceCalendar from '../me/AttendanceCalendar'
import { useSettingsDoc } from '../me/hooks'

export default function AttendanceSection({ user }) {
  const policy = useSettingsDoc('attendance')

  return (
    <div className="me-grid">
      <AttendanceActions uid={user.uid} policy={policy} />
      <div className="me-wide">
        <AttendanceCalendar uid={user.uid} policy={policy} />
      </div>
    </div>
  )
}
