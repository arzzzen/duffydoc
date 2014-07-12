// $(function() {

//   dropZone = $('#dropZone');
//   msg = $('.msg');
//   docx_html = $('.docx_html');
//   if (typeof(window.FileReader) == 'undefined') {
//       dropZone.text('Не поддерживается браузером!');
//       dropZone.addClass('error');
//   }

//   dropZone[0].ondragover = function() {
//       dropZone.addClass('hover');
//       msg.html('Put it here!');

//       return false;
//   };
      
//   dropZone[0].ondragleave = function() {
//       dropZone.removeClass('hover');
//       msg.html('Drop docx here!');
//       return false;
//   };

//   dropZone[0].ondrop = function(event) {
//       event.preventDefault();
//       dropZone.removeClass('hover');

//       var file = event.dataTransfer.files[0];

//       if (file.size > 20000000) {
//           msg.html('Too large file (>20M)!');
//           dropZone.addClass('error');
//           return false;
//       }

//       dropZone.addClass('drop');
//       msg.html('Wait...');

//       var fd = new FormData();
//       fd.append("template", file);

//       var xhr = new XMLHttpRequest();
//       xhr.onreadystatechange = function(event){
//         if (event.target.readyState == 4) {
//             if (event.target.status == 200) {
//               dropZone.hide();
//               docx_html.html(xhr.responseText);
//               docx_html.show();
//             } else {
//                 msg.html('<a>Произошла ошибка!</a>');
//                 dropZone.addClass('error');
//             }
//         }
//       };
//       xhr.open('POST', '/', true);
//       xhr.send(fd);
//   };

// })

$(function() {
  window.App = {
    Models: {},
    Collections: {},
    Views: {}
  };

  window.template = function(id){
    return _.template( $('#' + id).html());
  };

  App.Models.Document = Backbone.Model.extend({
    defaults: {
      html: ''
    },
  })

  App.Views.Document = Backbone.View.extend({
    template: template('doc'),

    events: {
      "mouseup": "selection",
      "click .downloadDoc": "download"
    },

    initialize: function(options) {
      this.vars = options.vars;
      this.$el = options.$el;
      this.render();
      this.listenTo(this.model, "change:html", this.render);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    selection: function() {
      selection = window.getSelection();
      if (selection.type == "Caret" || selection.type == "Nonw")
        return;

      selection = selection.getRangeAt(0);

      selected_str = selection.toString();

      var vars = this.vars.models;

      if (vars.length === 0 || _.last(vars).get("approved"))
        this.vars.add({
          name: "variable_" + parseInt(vars.length+1),
          old_text: selected_str,
          selection: window.getSelection().getRangeAt(0)
        });
      else
        _.last(vars).set({
          old_text: selected_str,
          selection: window.getSelection().getRangeAt(0)
        });
    },

    download: function() {
      
    }
  })

  App.Models.DocVar = Backbone.Model.extend({
    defaults: {
      name: "Var",
      old_text: "",
      approved: false,
      value: ""
    }
  })

  App.Views.DocVar = Backbone.View.extend({
    template: template('docVar'),

    events: {
      "click .approveVar": "approve",
      "click .saveVar": "saveVar"
    },

    initialize: function(options) {
      this.docView = options.docView;
    },

    render: function() {
      this.setElement(this.template(this.model.toJSON()));
      return this;
    },

    approve: function() {

      var modelSelection = this.model.get('selection');

      if (!modelSelection.collapsed) {

        var $selectionNode = $(document.createElement("mark"))
          .addClass(this.model.get('name'));

        modelSelection.surroundContents($selectionNode[0]);

        var varOnDocument = new App.Views.VarOnDocument({
          model: this.model,
          $el: $selectionNode
        });

        $selectionNode.prepend( varOnDocument.render().el );

        this.model.set('approved', true);
      }
    },

    saveVar: function() {
      this.model.set('value', this.$el.find('.value').val());
      this.render();
    }

  })

  App.Views.VarOnDocument = Backbone.View.extend({
    template: template('VarOnDoc'),

    initialize: function(options) {
      this.$el = options.$el;
      this.render();
      this.listenTo(this.model, "add change remove", this.render);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  })

  App.Collections.DocVars = Backbone.Collection.extend({
    model: App.Models.DocVar
  })

  App.Views.DocVars = Backbone.View.extend({
    template: template('docVars'),

    initialize: function(options) {
      this.docView = options.docView;
      this.$el = options.$el;
      this.render();
      this.listenTo(this.collection, "add change remove", this.render);
    },

    render: function() {
      this.$el.html(this.template());

      if (this.collection.length === 0)
        this.$el.find('tbody').append('<tr><td colspan="5" class="text-center">-- There is no variables, yet. --</td></tr>');

      this.collection.each(function(docVar, i){

        var varView = new App.Views.DocVar({
          model: docVar,
          docView: this.docView
        });
        this.$el.find('tbody').append(varView.render().el);
      }, this)

      return this;
    },
  })

  docVars = new App.Collections.DocVars();

  doc = new App.Models.Document();

  var documentView = new App.Views.Document({
    model:doc,
    vars: docVars,
    $el: $('#document')
  });

  var docVarsView = new App.Views.DocVars({
    collection: docVars,
    docView: documentView,
    $el: $('#palette')
  });

  $.get('/test.html', function(data) {
    doc.set('html', data);
  })
})