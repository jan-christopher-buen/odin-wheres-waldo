export default function Portrait({ target }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={
        target.symbol === 'robot'
          ? '0 0 60 80'
          : target.symbol === 'cat' || target.symbol === 'teapot'
            ? '0 0 70 60'
            : '0 0 60 60'
      }
    >
      <use href={`/portraits.svg#${target.symbol}`} />
    </svg>
  )
}
