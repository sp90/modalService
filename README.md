# modalService
Modal service, angular 1.5+ to use with components

```javascript
ModalService.open({
  component: 'mySettings', // This uses this mySettings components
  closeButton: false, // Default true
  closeByEscape: false, // Default true
  closeByDocument: false, // Default true
  bindings: {
    isPopup: [Obj] // here you can parse objects, values, everything
  }
});
```

You can use this
