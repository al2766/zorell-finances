type ChipVariant = 'green' | 'red' | 'amber' | 'blue' | 'gray'

interface StatusChipProps {
  label: string
  variant: ChipVariant
}

export default function StatusChip({ label, variant }: StatusChipProps) {
  return (
    <span className={`chip chip-${variant}`}>{label}</span>
  )
}
