import base from '@cuweave/config/eslint/base'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const config = [...base, ...nextVitals, ...nextTypeScript]

export default config
