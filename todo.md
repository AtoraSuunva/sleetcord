# TODO:

- Maybe arg typings? Probably later

- Autocomplete handling
  - Attached to arguments? Give params an `autocomplete: (i: CommandInteraction, input: string, focused: string) => string[]`? Sleet handles calling the right one?

- Maybe live loading
  - Not supported for modules though, will cause memory leaks right now (though acceptable for dev work?)

- Add reload/put commands commands as helpful "base" commands -> separate packages?
  - eval command

- More helpers?
  - Probably just based on what common things I need later on, that are very common or core to sleet
