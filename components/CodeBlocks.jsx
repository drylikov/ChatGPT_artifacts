import io from 'socket.io-client'
import { useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

import clx from '@functions/clx'
import CodeRenderer from './CodeRenderer'
import styles from '@styles/CodeBlocks.module.scss'
import { useAppContext } from '@contexts/AppContext'

export default ({ hasCalledBackend }) => {
  const { state, setState } = useAppContext()
  const { codeBlocks, sandboxMode, activeButton, consoleOutput, streamFinished, consoleOutputFinished } = state

  useEffect(() => {
    if (activeButton && activeButton !== 'preview') return
    if (!codeBlocks.length) return
    setState({ activeButton: codeBlocks[0].language })
  }, [codeBlocks])

  useEffect(() => {
    const socket = io()
    socket.on('codeBlocks', message => {
      setState(prevState => ({
        ...prevState,
        consoleOutput: [...prevState.consoleOutput, message]
      }))

      const consoleOutputFinished = message.includes('Server process exited')
      setState({ consoleOutputFinished })
    })
    return () => socket.disconnect()
  }, [])

  const socketSend = ({ codeBlocks }) => {
    const socket = io()
    socket.emit('codeBlocks', codeBlocks)
  }

  useEffect(() => {
    const complete = streamFinished &&
      codeBlocks.length > 0 &&
      codeBlocks.every(item => item.complete)
    if (complete && !hasCalledBackend.current) {
      socketSend({ codeBlocks })
      hasCalledBackend.current = true
    }
  }, [codeBlocks, streamFinished])

  return (
    <div className={clx(styles.codeBlocksWrapper, codeBlocks.length ? styles.show : '')}>
      <div className={styles.tabHeader}>
        {
          sandboxMode
            ? (
              <button
                onClick={() => setState({ activeButton: 'console' })}
                className={clx(styles.tabItem, activeButton === 'console' ? styles.active : '')}
              >
                <span>Console</span>
                {
                  (consoleOutput.length && !consoleOutputFinished)
                    ? <span className={styles.spinner} />
                    : null
                }
              </button>
              )
            : (
              <button
                onClick={() => setState({ activeButton: 'preview' })}
                className={clx(styles.tabItem, activeButton === 'preview' ? styles.active : '')}
              >
                Preview
              </button>
              )
        }

        {codeBlocks.map((block, index) => {
          return (
            <button
              key={index}
              onClick={() => setState({ activeButton: block.language })}
              className={clx(styles.tabItem, activeButton === block.language ? styles.active : '')}
            >
              <span>{block.language}</span>
              {
                (!block.complete)
                  ? <span className={styles.spinner} />
                  : null
              }
            </button>
          )
        })}
      </div>

      <div className={styles.tabContent}>
        {
          sandboxMode
            ? (
              <SyntaxHighlighter
                style={oneDark}
                language='bash'
                className={clx(styles.tabItem, activeButton === 'console' ? styles.active : styles.hidden)}
              >
                {consoleOutput.join('\n')}
              </SyntaxHighlighter>
              )
            : (
              <div
                className={clx(
                  styles.tabItem,
                  styles.preview,
                  activeButton === 'preview' ? styles.active : styles.hidden
                )}
              >
                <CodeRenderer codeBlocks={codeBlocks} />
              </div>
              )
        }

        {codeBlocks.map((block, index) => (
          <SyntaxHighlighter
            key={index}
            style={oneDark}
            language={block.language}
            className={clx(styles.tabItem, activeButton === block.language ? styles.active : styles.hidden)}
          >
            {block.code}
          </SyntaxHighlighter>
        ))}
      </div>
    </div>
  )
}
