import type { ExportInput } from '@bllt/shared'
import { Notification, shell, utilityProcess } from 'electron'
import { basename, join } from 'node:path'
import { EventChannel, type ExportProgress } from '../../../types/api'
import { paths } from '../../core/config'
import { broadcast } from '../../core/ipc'
import { newId } from '../../utils/id'
import type { ExportJob, ExportMessage } from './export.worker'

function emit(progress: ExportProgress): void {
  broadcast(EventChannel.EXPORT_PROGRESS, progress)
}

export const exportService = {
  /** Launches the export in a background utility process and reports progress by event. */
  start(input: ExportInput): { jobId: string } {
    const jobId = newId()
    const job: ExportJob = {
      jobId,
      dbPath: paths.database,
      outDir: paths.exports,
      from: input.from,
      to: input.to,
      format: input.format
    }
    const child = utilityProcess.fork(join(__dirname, 'export-worker.js'), [], {
      serviceName: 'Bllt export'
    })
    let finished = false
    child.on('message', (message: ExportMessage) => {
      if (message.type === 'progress') {
        emit({ jobId, stage: 'RUNNING', percent: message.percent })
      } else if (message.type === 'done') {
        finished = true
        emit({ jobId, stage: 'DONE', percent: 100, file: message.file })
        const note = new Notification({
          title: 'Exportación lista',
          body: `${basename(message.file)} · ${message.rows} líneas`
        })
        note.on('click', () => shell.showItemInFolder(message.file))
        note.show()
      } else {
        finished = true
        emit({ jobId, stage: 'ERROR', percent: 0, message: message.message })
      }
    })
    child.on('exit', (code) => {
      if (!finished && code !== 0) {
        emit({ jobId, stage: 'ERROR', percent: 0, message: 'La exportación se detuvo' })
      }
    })
    child.postMessage(job)
    emit({ jobId, stage: 'RUNNING', percent: 0 })
    return { jobId }
  }
}
