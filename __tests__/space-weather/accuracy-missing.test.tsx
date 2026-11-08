import React from 'react'
import {render,screen} from '@testing-library/react'
import SunspotDisplay from '@/components/space-weather/SunspotDisplay'
import KpIndexGauge from '@/components/space-weather/KpIndexGauge'
import SolarWindStats from '@/components/space-weather/SolarWindStats'
it('labels monthly sunspots and unavailable observations without quiet defaults',()=>{
 render(<SunspotDisplay data={null}/> )
 expect(screen.getByText('Monthly Sunspot Number')).toBeInTheDocument()
 expect(screen.queryByText('QUIET')).not.toBeInTheDocument()
 expect(screen.queryByText('RISING')).not.toBeInTheDocument()
 expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument()
})
it('does not classify missing wind and density as slow or low',()=>{
 render(<SolarWindStats data={null}/> )
 expect(screen.queryByText('SLOW')).not.toBeInTheDocument()
 expect(screen.queryByText('LOW')).not.toBeInTheDocument()
 expect(screen.getAllByText('UNAVAILABLE')).toHaveLength(3)
})
it('labels sparse Kp outlook coverage as sampled blocks rather than a continuous six hours',()=>{
 render(<KpIndexGauge data={{current:{value:2,timeTag:''},forecast:{expected:3,maxExpected:4,blocks:2}}}/> )
 expect(screen.getByText('NEXT 24H OUTLOOK · 2 THREE-HOUR BLOCKS')).toBeInTheDocument()
})
