$(function(){

  var Eatery = Backbone.Model.extend({

    // Default attributes for the todo item.
    defaults: function() {
      return {
        name: "New Eatery",
        order: Eateries.nextOrder(),
        address: "New Address"
      };
    },

    // Ensure that each todo created has `title`.
    initialize: function() {
      if (!this.get("name")) {
        this.set({"name": this.defaults().name});
      }
    }
  });

  var EateryList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Eatery,

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    comparator: function(eatery) {
      return eatery.get('order');
    }

  });

  var Eateries = new EateryList;

  var EateryView = Backbone.View.extend({

    //... is a list tag.
    tagName:  "li",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
      "click .toggle"   : "toggleDone",
      "dblclick .view"  : "edit",
      "click a.destroy" : "clear",
      "keypress .edit"  : "updateOnEnter",
      "blur .edit"      : "close"
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.input = this.$('.edit');
      return this;
    },

    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
      var value = this.input.val();
      if (!value) {
        this.clear();
      } else {
        this.model.save({title: value});
        this.$el.removeClass("editing");
      }
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.destroy();
    }

  });

  // The Application
  // ---------------

  // Our overall **AppView** is the top-level piece of UI.
  var AppView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#eallaryapp"),

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "click #clear-completed": "clearCompleted",
      "click #toggle-all": "toggleAllComplete"
    },

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {

      this.listenTo(Eateries, 'add', this.addOne);
      this.listenTo(Eateries, 'reset', this.addAll);
      this.listenTo(Eateries, 'all', this.render);

      this.footer = this.$('footer');
      this.main = $('#main');

      Eateries.fetch(
        {url: "./eateries.json"}
      );
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {

      if (Eateries.length) {
        this.main.show();
        this.footer.show();
      } else {
        this.main.hide();
        this.footer.hide();
      }

    },

    addOne: function(eatery) {
      var view = new EateryView({model: eatery});
      this.$("#eatery-list").append(view.render().el);
    },

    addAll: function() {
      Eateries.each(this.addOne, this);
    },

    // If you hit return in the main input field, create new **Todo** model,
    // persisting it to *localStorage*.
    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      if (!this.input.val()) return;

      Eateries.create({title: this.input.val()});
      this.input.val('');
    }

  });

  // Finally, we kick things off by creating the **App**.
  var App = new AppView;

});
