import AttendanceActions from '../me/AttendanceActions'
import AttendanceCalendar from '../me/AttendanceCalendar'
import { useSettingsDoc } from '../me/hooks'
import { Panel } from './ui'

export default function AttendanceSection({ user }) {
  const policy = useSettingsDoc('attendance')

  return (
    <Panel title="Attendance management">
      <AttendanceActions uid={user.uid} policy={policy} />
      <AttendanceCalendar uid={user.uid} policy={policy} />
    </Panel>
  )
}
