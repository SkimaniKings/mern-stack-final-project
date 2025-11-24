"use client"

import React from 'react'

interface MobileTabButtonsProps {
  tabIds: string[]
  tabLabels: string[]
}

export function MobileTabButtons({ tabIds, tabLabels }: MobileTabButtonsProps) {
  const handleTabClick = (tabId: string) => {
    const tabsElement = document.querySelector(`[data-value="${tabId}"]`) as HTMLElement
    if (tabsElement) tabsElement.click()
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:hidden mt-6">
      {tabIds.map((tabId, index) => (
        <button 
          key={tabId}
          className="flex items-center justify-center p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          onClick={() => handleTabClick(tabId)}
        >
          <span className="font-medium">{tabLabels[index]}</span>
        </button>
      ))}
    </div>
  )
}
