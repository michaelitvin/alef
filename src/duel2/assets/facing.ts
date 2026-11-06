// Which way each sprite faces as drawn (rule: a moving sprite faces the way it moves). The ghosts float in from the right
// towards the wizard, so they must face left; the broom flies right.
export const FACING: Record<string, 'left' | 'right' | 'front'> = {
  's-ghost': 'right', 's-wizbroom': 'right', 's-wizard-cast': 'right', 's-wizard-idle': 'front',
  // the flight bosses sit on the right and must face the wizard (the parent: they faced right)
  'boss-dot': 'right', 'boss-shin': 'right', 'boss-mimic': 'left', 'boss-bat': 'right',
}
