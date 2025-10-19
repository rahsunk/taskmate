## Spec changes:
- The original spec, `EventSharing` was dependent on the `ScheduleGenerator` concept, so I refactored it into a generic `ItemSharing` concept to improve modularity and separation of concerns.
- `Events` are no longer referenced in the state, instead a generic `Item` is to be shared.
- In the state:
	- `SharedEvents => SharedItems`
	- `Requests => ChangeRequests`
	- IDs for a `SharedItem` and the corresponding original `Item` have been added
	- Since the times of events can no longer be referenced, requesters request changes to the `properties` of a `SharedItem` through `requestChange`

## Frequent Issues:
- As this was the last concept I worked on, by this point, I experienced significantly less compile issues when using the LLM.
- Originally, one of the LLM-generated test cases had a type error that was caused by the given code not casting an `ItemID` and a string concatenation back to the `ItemID` type. This was easily fixed by casting using the key word `as`.