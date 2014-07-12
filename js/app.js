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
      html: '',
      text: ''
    },

    // Для идентичного поиска на сервере и клиенте из текста убираются тэги а переносы строк заменяются пробелами
    removeHtmlAndLineEnd: function(str) {
      return str.replace(/<\/?[^>]+>/gi, '').replace('&shy;', '').replace(/[\n\r]/g, ' ');
    },
  })

  App.Views.Document = Backbone.View.extend({
    template: template('doc'),

    events: {
      "mouseup": "selection"
    },

    initialize: function(options) {
      this.$el = options.$el;
      this.render();
      this.$el.niceScroll({
        cursorwidth: "10px",
        cursorcolor: "#A2A7A9",
        cursorborderradius: "5px",
        autohidemode: "false"
      });
      var htmlFileUrl = '/upload/'+settings.d+'/'+settings.f+'.html';

      $.get(htmlFileUrl, function(data) {
        dd.doc.set('html', data.replace(/[\n\r]/g, ' '));
        dd.doc.set('text', dd.doc.removeHtmlAndLineEnd(data));
      })

      this.listenTo(this.model, "change:html", this.render);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    selection: function() {
      var selection = window.getSelection();
      var selectionCommonContainer = selection.getRangeAt(0).commonAncestorContainer.parentElement;
      if (selection.type == "Caret"
        || selection.type == "Nonw"
        || (!$.contains(this.$el[0], selectionCommonContainer)
            && this.$el[0] !== selectionCommonContainer)) return;

      selected_str = selection.getRangeAt(0).toString();

      var vars = dd.docVars.models;

      if (vars.length === 0 || _.last(vars).get("saved"))
        dd.docVars.add({
          name: "variable_" + parseInt(vars.length+1),
          old_text: selected_str.replace(/[\n\r]/g, ' '),
          value: selected_str.replace(/[\n\r]/g, ' '),
          selection: selection.getRangeAt(0).cloneRange()
        });
      else
        _.last(vars).set({
          old_text: selected_str.replace(/[\n\r]/g, ' '),
          value: selected_str.replace(/[\n\r]/g, ' '),
          selection: selection.getRangeAt(0).cloneRange()
        });
    }
  })

  App.Models.DocTools = Backbone.Model.extend({
    defaults: {
      fileName: settings.n
    },
  })

  App.Views.DocTools = Backbone.View.extend({
    template: template('doc-tools'),

    events : {
      "click #doc-download": "downloadDoc",
      "click #doc-change": "changeDoc"
    },

    initialize: function(options) {
      this.$el = options.$el;
      this.render();
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    downloadDoc: function() {
      var postObj = _.filter(dd.docVars.models, function(model) {
        return model.get('saved');
      });
      postObj = _.map(postObj, function(model, key, collection) {
        return {
          value: model.get('old_text'),
          replace: model.get('value'),
          matchNumber: model.get('matchNumber')
        }
      });
      $.post('/app/', { variables:JSON.stringify(postObj), settings: settings}, function(data) {
        window.open(data, '_blank');
      })
    },

    changeDoc: function() {
      alert('Temporary not working');
    }
  })

  App.Models.DocVar = Backbone.Model.extend({
    defaults: {
      name: "Var",
      old_text: "",
      saved: false,
      value: "",
      selection: {}, // Range object of selection
      matchNumber: 0,
      editing: true
    },

    findMatch: function() {
      var oldText = new RegExp(this.escapeRegExp(this.get('old_text')), 'g'),
          varPosInHtml = dd.docView.$el.html().indexOf('<mark class="'+this.get('name')+'">'),
          htmlBeforeVar = dd.docView.$el.html().substr(0, varPosInHtml),
          htmlBeforeVarOld = this.htmlToOld(htmlBeforeVar),
          textBeforeVarOld = dd.doc.removeHtmlAndLineEnd(htmlBeforeVarOld),
          matchNumber = textBeforeVarOld.match(oldText);

      return matchNumber === null ? 0 : matchNumber.length;
    },

    escapeRegExp: function (str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },

    // Принимает html документа с переменными и заменяет их на старые слова
    htmlToOld: function(html) {
      var reg = /<mark class="variable_([\d]+)">.+<\/mark>/g;

      html = html.replace(reg, function(mark, varNumber) {
        var docVar = _.find(dd.docVars.models, function(docVar) {
          return docVar.get('name') == 'variable_'+varNumber;
        });

        return docVar.get('old_text');
      })

      return html;
    }
  })

  App.Views.DocVar = Backbone.View.extend({
    template: template('docVar'),

    events: {
      "click .saveVar": "saveVar",
      "click .toggleEditing": "toggleEditing"
    },

    render: function() {
      this.setElement(this.template(this.model.toJSON()));
      return this;
    },

    saveVar: function() {
      var modelSelectionRange = this.model.get('selection');
      var str = modelSelectionRange.toString();

      var $selectionNode = $(document.createElement("mark"))
          .addClass(this.model.get('name'));

      try {
        modelSelectionRange.surroundContents($selectionNode[0]);
      } catch(e) {
        // if selection the Range has partially selected a non-Text node.
        var startContElement = modelSelectionRange.startContainer.parentElement;
        modelSelectionRange.deleteContents();
        $(startContElement).append($selectionNode.html(str));
      }

      var varOnDocument = new App.Views.VarOnDocument({
        model: this.model,
        $el: $selectionNode
      });

      $selectionNode.prepend( varOnDocument.render().el );

      this.model.set('value', this.$el.find('.newValue').val());
      this.model.set('saved', true);
      this.model.set('editing', false)

      this.model.set('matchNumber', this.model.findMatch());
    },

    toggleEditing: function() {
      if (this.model.get('saved'))
        this.model.set('editing', !this.model.get('editing'));
      else
        dd.docVars.remove(this.model);
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
      this.$el = options.$el;
      this.render();
      this.listenTo(this.collection, "add change remove", this.render);
    },

    render: function() {
      this.$el.html(this.template());

      if (this.collection.length === 0)
        this.$el.find('tbody').append('<tr><td colspan="4" class="text-center">-- There is no variables, yet. --</td></tr>');

      this.collection.each(function(docVar, i){

        var varView = new App.Views.DocVar({
          model: docVar,
        });
        this.$el.find('tbody').append(varView.render().el);
        varView.$el.find('.docVarAdd').animate({opacity: 1}, 250)
      }, this)

      return this;
    },
  })

  window.dd = {};

  dd.doc = new App.Models.Document();

  dd.docView = new App.Views.Document({
    model: dd.doc,
    $el: $('#document-wrap')
  });

  dd.docTools = new App.Models.DocTools();

  dd.docToolsView = new App.Views.DocTools({
    model: dd.docTools,
    $el: $('#dd_doc-tools')
  });

  dd.docVars = new App.Collections.DocVars();

  dd.docVarsView = new App.Views.DocVars({
    collection: dd.docVars,
    $el: $('#palette')
  });

})