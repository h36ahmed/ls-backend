const fs = require('fs')
const uuid = require('uuid')
const moment = require('moment')

const formatTime = (time) => {
  let hours = parseInt(time.split(' ')[0].split(':')[0])
  let minutes = parseInt(time.split(' ')[0].split(':')[1])
  const amOrPm = time.split(' ')[1]

  if (hours < 10) {
    hours = `0${hours}`
  }

  if (minutes < 10) {
    minutes = `0${minutes}`
  }

  if (amOrPm.toLowerCase() === 'pm') {
    hours = hours + 12
  }

  return `${hours}${minutes}`
}

exports.generateICS = (attributes) => {
  const start_time = formatTime(attributes.pick_up_time.split(' to ')[0])
  const end_time = formatTime(attributes.pick_up_time.split(' to ')[1])
  const date = moment(attributes.date).format('YYYYMMDD')
  const uid = uuid.v1()

  const icsData =
`BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:-//Adam Gibbons//agibbons.com//ICS: iCalendar Generator
BEGIN:VEVENT
DTSTAMP:${moment().format('YYYYMMDDTHHmmss')}
DTSTART:${date}T${start_time}00
DTEND:${date}T${end_time}00
SUMMARY:Meal reserved for ${moment(attributes.date).format('MMMM DD, YYYY')}
DESCRIPTION:Your meal, ${attributes.meal.name}, is reserved at ${attributes.restaurant.name} at ${attributes.restaurant.street_address}
LOCATION:${attributes.restaurant.name}, ${attributes.restaurant.street_address}, ${attributes.restaurant.city}, ${attributes.restaurant.postal_code}
STATUS:confirmed
GEO:${attributes.restaurant.latitude};${attributes.restaurant.longitude}
ATTENDEE;CN=${attributes.name}:mailto:${attributes.email}
ORGANIZER;CN=Lunch Society:mailto:admin@lunchsociety.ca
CATEGORIES:10k races,Memorial Day Weekend,Boulder CO
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER:-PT24H
DESCRIPTION:Reminder
REPEAT:1
DURATION:PT15M
END:VALARM
BEGIN:VALARM
ACTION:AUDIO
TRIGGER:-PT30M
END:VALARM
END:VEVENT
END:VCALENDAR`

  fs.writeFileSync('./server/routes/icsData/event.ics', icsData)

  // const emailData = {

  // }

  // const emailLink = `
  // https://www.google.com/calendar/event?
  // action=TEMPLATE&
  // pprop=${uid}&
  // dates=${date}T${start_time}00%2F${date}T${end_time}00&
  // text=Meal%20reserved%20for%20${moment(attributes.date).format('MMMM DD, YYYY')}&
  // location=${attributes.restaurant.name}%2C%20${attributes.restaurant.street_address}%2C%20${attributes.restaurant.city}%2C%20${attributes.restaurant.postal_code}&
  // details=Your%20meal%2C%20${attributes.meal.name}%2C%20is%20reserved%20at%20${attributes.restaurant.name}%20at%20`

  // %2F == /
  // %3A == :
  // %20 == space
  // %2C == ,
  // %40 == @

  // return emailData
}

// 3e1ea1d0-629a-11e7-92a4-d1fa72278b2f
// https://www.google.com/calendar/event?
// action=TEMPLATE&
// pprop=eidmsgid%3A_c9i3ge1g6gqj0b9mc8r64b9h65ijeb9o6gq36b9i6lijadhnc8r36c9g68_15d53ce4d341c950&
// dates=20170717T113000%2F20170717T114500&
// text=Meal%20reserved%20for%20July%2017%2C%202017&
// location=Amsterdam%20BrewHouse%2C%20245%20Queens%20Quay%20W%2C%20Toronto%2C%20m5j2k9&
// details=Your%20meal%2C%20Angus%20beef%20burger%2C%20is%20reserved%20at%20Amsterdam%20BrewHouse%20at%20245%20Queens%20Quay%20W&
// add=jeffreycj.chang%40gmail.com&
// ctok=amVmZnJleWNqLmNoYW5nQGdtYWlsLmNvbQ




