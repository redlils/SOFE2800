export type ReqPostAuthLoginBody = {
  username: string,
  password: string
}

export type ReqPostAuthRegisterBody = {
  username: string,
  password: string,
  isOwner: boolean,
  isWalker: boolean
}

export type ReqPostJobBody = {
  dogId: number,
  pay: number,
  location: {
    latitude: number,
    longitude: number,
  },
  deadline: APIDate
}

export type ReqPatchUserIdBody = {
  isOwner?: boolean,
  isWalker?: boolean
}

export type ReqPostUserIdDogsBody = {
  name: string,
  breed: string,
  age: number
}

export type ReqPatchUserIdDogsIdBody = ReqPostUserIdDogsBody

export type APIUser = {
  id: number,
  username: string,
  isOwner: boolean,
  isWalker: boolean,
  dogsUrl: string,
  userUrl: string
}

export type DatabaseUserRow = {
  id: number,
  username: string,
  password: string,
  is_owner: number,
  is_walker: number
}

export type APIDog = {
  id: number,
  owner: APIUser,
  name: string,
  breed: string,
  age: number,
  dogUrl: string
}

export type DatabaseDogRow = {
  id: number,
  owner_id: number,
  name: string,
  breed: string,
  age: number
}

export type JobStatus = "posted" | "accepted" | "completed" | "paid" | "overdue"
export type APIDate = number

export type APIJob = {
  id: number,
  owner: APIUser,
  dog: APIDog,
  walker?: APIUser,
  status: JobStatus,
  pay: number,
  location: {
    latitude: number,
    longitude: number
  },
  deadline: APIDate,
  jobUrl: string
}

export type DatabaseJobRow = {
  id: number,
  owner_id: number,
  dog_id: number,
  walker_id: number,
  status: JobStatus
  pay: number,
  location_lat: number,
  location_lng: number,
  deadline: number
}