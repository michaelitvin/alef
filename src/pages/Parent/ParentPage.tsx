// The main app's parent route (#/settings): the shared parent area, opened at the lessons. The route itself is the gate
// on every mount (rule: no way past the gate by history): Back, Forward or a reload to it shows the held gear and the
// year of birth again. Only the home gear's own gate lets the next mount open the area at once (gateToken). Close
// replaces the route's history entry, so Back does not return to it either.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors } from '../../styles/theme'
import { Header } from '../../components/navigation/Navigation'
import { ParentGate } from '../../shared/parentGate/ParentGate'
import { GearIcon } from '../../components/home/HomeIcons'
import { ParentArea } from '../../parent/ParentArea'
import { hasGatePass, takeGatePass } from '../../parent/gateToken'
import './parentPage.css'

export function ParentPage() {
  const navigate = useNavigate()
  const home = () => navigate('/', { replace: true })
  const [open, setOpen] = useState(hasGatePass)
  useEffect(() => { takeGatePass() }, [])
  if (open) return <ParentArea game="lessons" onClose={home} />
  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', flexDirection: 'column' }}>
      <Header title="הגדרות" showBack onBack={() => navigate('/')} />
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        {/* a wrong year goes back home, with no message */}
        <ParentGate label="settings (hold)" className="settings-gate" onOpen={() => setOpen(true)} onCancel={home}
          ring={{ track: colors.neutral[200], fill: colors.primary[500], width: 4, trackWidth: 4 }}
          overlay={<GearIcon size="40px" />} />
      </div>
    </div>
  )
}
