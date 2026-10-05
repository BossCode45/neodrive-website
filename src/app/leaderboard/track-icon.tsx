/** The in-game track type icon: a circular arrow for loop tracks, a winding route for point-to-point. */
export default function TrackIcon({ loop, className }: { loop: boolean; className?: string }) {
  return (
	<svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
	  {loop ? (
		<>
		  <path d="M12.5 24.5H11C6.3 24.5 3 21 3 16.5S6.8 8 11.5 8h9C25.2 8 29 11.6 29 16.5S25.2 24.5 20.5 24.5h-3"/>
		  <path d="M20.5 20.5l-4 4 4 4"/>
		</>
	  ) : (
		<>
		  <path d="M6.5 23V11a4.5 4.5 0 0 1 9 0v10a4.5 4.5 0 0 0 9 0V9"/>
		  <circle cx="6.5" cy="26" r="3"/>
		  <circle cx="24.5" cy="6" r="3"/>
		</>
	  )}
	</svg>
  );
}
