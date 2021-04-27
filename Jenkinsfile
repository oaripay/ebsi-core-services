node {
    stage('Clone repo') {
        checkout([
          $class: 'GitSCM',
          branches: scm.branches,
          doGenerateSubmoduleConfigurations: false,
          extensions: [[
              $class: 'SubmoduleOption',
              disableSubmodules: false,
              parentCredentials: true,
              recursiveSubmodules: true,
              reference: '',
              trackingSubmodules: false
          ]],
          submoduleCfg: [],
          userRemoteConfigs: scm.userRemoteConfigs
      ])
    }
    ebsi_deploy("clone_repo": false)
}
