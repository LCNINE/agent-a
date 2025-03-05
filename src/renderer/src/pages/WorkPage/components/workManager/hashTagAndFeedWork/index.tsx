import React from 'react'
import { WorkFormDialog } from './WorkFormDialog'
import { WorkTable } from './WorkTable'

export default function HashTagAndFeedWork() {
  return (
    <>
      <div className="absolute right-0 top-0">
        <WorkFormDialog work={null} />
      </div>
      <WorkTable />
    </>
  )
}
